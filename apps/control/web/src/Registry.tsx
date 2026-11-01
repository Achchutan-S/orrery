import { useEffect, useState } from 'react';
import { Availability, KindMark, LifecycleMark, Link, PageHeading, usePath } from './components.tsx';
import { ENV_LABEL, ENVIRONMENTS, FILTERS, formatAccess, matches, sortItems, type Filter, type Sort } from './model.ts';
import { useControl } from './state.tsx';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'catalog', label: 'Catalog order' },
  { value: 'name', label: 'Name' },
  { value: 'lifecycle', label: 'Lifecycle' },
  { value: 'kind', label: 'Kind' },
];

export function Registry() {
  const { data } = useControl();
  const params = usePath().searchParams;
  const [filter, setFilter] = useState<Filter>(() => (FILTERS.some((f) => f.value === params.get('filter')) ? params.get('filter') as Filter : 'all'));
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>(() => (SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') as Sort : 'catalog'));

  // Keep the view in the address, so Back from a detail page returns to the same list.
  useEffect(() => {
    const q = new URLSearchParams();
    if (filter !== 'all') q.set('filter', filter);
    if (query) q.set('q', query);
    if (sort !== 'catalog') q.set('sort', sort);
    history.replaceState(null, '', `/experiences${q.size ? `?${q}` : ''}`);
  }, [filter, query, sort]);

  const all = data!.registry.experiences;
  const shown = sortItems(all.filter((i) => matches(i, filter, query)), sort);

  return (
    <section className="page">
      <PageHeading title="Experiences" kicker="Registry">
        <p className="lede">Every entry in the catalog, with its release entry and what each environment does with it.</p>
      </PageHeading>

      <form className="controls" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="q">Search by name or id</label>
          <input id="q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <fieldset className="segments">
          <legend>Show</legend>
          {FILTERS.map((f) => (
            <label key={f.value}>
              <input type="radio" name="filter" value={f.value} checked={filter === f.value} onChange={() => setFilter(f.value)} />
              <span>{f.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </form>

      <p className="result-count" role="status">
        {all.length === 0 ? 'No experiences are registered in the catalog.' : `Showing ${shown.length} of ${all.length} experiences.`}
      </p>

      {shown.length > 0 ? (
        <table className="registry">
          <caption className="visually-hidden">Experiences</caption>
          <thead>
            <tr>
              <th scope="col">Experience</th>
              <th scope="col">Kind</th>
              <th scope="col">Lifecycle</th>
              <th scope="col">Access · discovery</th>
              {ENVIRONMENTS.map((env) => <th scope="col" key={env}>{ENV_LABEL[env]}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} data-id={i.id}>
                <th scope="row" className="exp">
                  <Link to={`/experiences/${i.id}`}>{i.definition.title}</Link>
                  <code className="id">{i.id}</code>
                  <span className="summary">{i.definition.summary}</span>
                  {i.issues.length > 0 && <span className="issue-count">{i.issues.length} {i.issues.length === 1 ? 'issue' : 'issues'}</span>}
                </th>
                <td><span className="cell-label" aria-hidden="true">Kind</span><KindMark item={i} /></td>
                <td>
                  <span className="cell-label" aria-hidden="true">Lifecycle</span>
                  <LifecycleMark value={i.release.lifecycle} />
                  {!i.hasReleaseEntry && <span className="muted small">no entry (default)</span>}
                </td>
                <td><span className="cell-label" aria-hidden="true">Access</span>{formatAccess(i.release.access)} · {i.release.discoverability}</td>
                {ENVIRONMENTS.map((env) => (
                  <td key={env} data-env={env}><span className="cell-label" aria-hidden="true">{ENV_LABEL[env]}</span><Availability item={i} env={env} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : all.length > 0 && (
        <p className="empty">No experience matches {query ? <>“{query}”</> : 'this filter'}. <button type="button" className="link" onClick={() => { setQuery(''); setFilter('all'); }}>Show all</button></p>
      )}
    </section>
  );
}
