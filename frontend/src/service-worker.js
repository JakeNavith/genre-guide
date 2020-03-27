/*
    genre.guide - Sapper service worker JavaScript file
    Copyright (C) 2020 Navith

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/


import {files, routes, shell, timestamp} from "@sapper/service-worker"; // eslint-disable-line no-unused-vars

const ASSETS = `cache${timestamp}`,

	// `shell` is an array of all the files generated by the bundler,
	// `files` is an array of everything in the `static` directory
	to_cache = shell.concat(files),
	cached = new Set(to_cache);

self.addEventListener("install", (event) => { // eslint-disable-line no-shadow
	event.waitUntil(
		caches
			.open(ASSETS)
			.then((cache) => cache.addAll(to_cache))
			.then(() => {
				self.skipWaiting();
			}),
	);
});

self.addEventListener("activate", (event) => { // eslint-disable-line no-shadow
	event.waitUntil(
		caches.keys().then(async (keys) => {
			// Delete old caches
			for (const key of keys) if (key !== ASSETS) await caches.delete(key); // eslint-disable-line no-await-in-loop


			self.clients.claim();
		}),
	);
});

self.addEventListener("fetch", (event) => { // eslint-disable-line no-shadow
	if (event.request.method !== "GET" || event.request.headers.has("range")) return;

	const url = new URL(event.request.url);

	// Don't try to handle e.g. data: URIs
	if (!url.protocol.startsWith("http")) return;

	// Ignore dev server requests
	if (url.hostname === self.location.hostname && url.port !== self.location.port) return;

	// Always serve static files and bundler-generated assets from cache
	if (url.host === self.location.host && cached.has(url.pathname)) {
		event.respondWith(caches.match(event.request));
		return;
	}

	// For pages, you might want to serve a shell `service-worker-index.html` file,
	// Which Sapper has generated for you. It's not right for every
	// App, but if it's right for yours then uncomment this section
	/*
	If (url.origin === self.origin && routes.find(route => route.pattern.test(url.pathname))) {
		event.respondWith(caches.match('/service-worker-index.html'));
		return;
	}
	*/

	if (event.request.cache === "only-if-cached") return;

	// For everything else, try the network first, falling back to
	// Cache if the user is offline. (If the pages never change, you
	// Might prefer a cache-first approach to a network-first one.)
	event.respondWith(
		caches
			.open(`offline${timestamp}`)
			.then(async (cache) => {
				try {
					const response = await fetch(event.request);
					cache.put(event.request, response.clone());
					return response;
				} catch (err) {
					const response = await cache.match(event.request);
					if (response) return response;

					throw err;
				}
			}),
	);
});
