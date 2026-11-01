import type { APIRoute } from 'astro';
import { pdf } from '../assets.ts';

export const GET: APIRoute = () => new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf' } });
