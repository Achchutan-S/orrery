import type { APIRoute } from 'astro';
import { og } from '../assets.ts';

export const GET: APIRoute = () => new Response(new Uint8Array(og), { headers: { 'Content-Type': 'image/png' } });
