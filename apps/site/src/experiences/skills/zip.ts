// A minimal ZIP writer (PKWARE APPNOTE 6.3: local headers, central directory, end record), so a
// skill downloads as a folder without a new dependency. Deflate and CRC-32 come from node:zlib.
// Deterministic: the same files and date always give the same bytes.
import { crc32, deflateRawSync } from 'node:zlib';

export type ZipEntry = { path: string; data: Uint8Array };

/** MS-DOS date for YYYY-MM-DD at midnight (ZIP's only timestamp format). */
function dosDate(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return ((y - 1980) << 9) | (m << 5) | d;
}

export function zip(entries: readonly ZipEntry[], day = '1980-01-01'): Uint8Array {
  const date = dosDate(day);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { path, data } of entries) {
    const name = Buffer.from(path, 'utf8');
    const raw = Buffer.from(data);
    const packed = deflateRawSync(raw, { level: 9 });
    const deflate = packed.length < raw.length;
    const body = deflate ? packed : raw;
    const crc = crc32(raw);
    const common = (h: Buffer, at: number) => {
      h.writeUInt16LE(0x0800, at); // flags: names are UTF-8
      h.writeUInt16LE(deflate ? 8 : 0, at + 2);
      h.writeUInt16LE(0, at + 4); // time 00:00
      h.writeUInt16LE(date, at + 6);
      h.writeUInt32LE(crc, at + 8);
      h.writeUInt32LE(body.length, at + 12);
      h.writeUInt32LE(raw.length, at + 16);
      h.writeUInt16LE(name.length, at + 20);
    };
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0
    common(local, 6);
    local.writeUInt16LE(0, 28); // extra length
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix, 2.0
    central.writeUInt16LE(20, 6);
    common(central, 8);
    central.writeUInt32LE(0o100644 * 0x10000, 38); // regular file, rw-r--r-- (multiply: << would overflow to negative)
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}
