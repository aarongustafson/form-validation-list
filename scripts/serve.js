import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
};

createServer(async (request, response) => {
	let path;
	try {
		const url = new URL(request.url, 'http://localhost');
		const pathname = decodeURIComponent(url.pathname);
		if (pathname.includes('\0')) {
			response.writeHead(400).end('Bad request');
			return;
		}
		path = resolve(
			root,
			`.${pathname}`,
			url.pathname.endsWith('/') ? 'index.html' : '',
		);
	} catch (error) {
		if (!(error instanceof URIError) && error.code !== 'ERR_INVALID_URL')
			throw error;
		response.writeHead(400).end('Bad request');
		return;
	}
	if (!path.startsWith(`${root}${sep}`)) {
		response.writeHead(403).end('Forbidden');
		return;
	}
	try {
		const content = await readFile(path);
		response
			.writeHead(200, {
				'Content-Type':
					types[extname(path)] || 'application/octet-stream',
			})
			.end(content);
	} catch (error) {
		if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
		response.writeHead(404).end('Not found');
	}
}).listen(4177, '127.0.0.1', () =>
	console.log('Demo server: http://127.0.0.1:4177/demo/'),
);
