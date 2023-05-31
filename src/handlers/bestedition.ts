import { IRequest } from 'itty-router';
import { Env } from '..';
import { getCover } from './read';

const baseUrl = 'https://openlibrary.org';
const maxResults = 10000;

class BookMetaData {
	name!: string;
	link!: string;
	authors!: string[];
	authorLinks!: string[];
	published!: string;
	publishers?: string[];
	covers?: number[];
	languages?: string[];
	pages?: number;
	physicalFormat?: string;
	isbn?: string;
	description?: string;
	deweyDecimalClass?: string[];
	publishCountry?: string;
	latestRevision?: number;
	identifiers?: string[];
}

const bookOverridesKV = 'bookoverrides.';

async function getBestBooks(
	workId: string,
	env: Env,
	bypassCache: boolean = false
): Promise<BookMetaData[]> {
	const overrideData = await env.BOOKS.get(bookOverridesKV + workId);
	var bookMetaData: BookMetaData[] = [];

	if (overrideData == null || overrideData == undefined || bypassCache) {
		var url: string = `${baseUrl}/works/${workId}/editions.json?limit=${maxResults}`;

		while (true) {
			//console.log('url' + url);
			// Get all editions of the work
			const editionsResponse: {
				links: {
					self: string;
					work: string;
					prev?: string;
					next?: string;
				};
				size: number;
				entries: {
					type: {
						key: string;
					};
					authors: {
						key: string;
					}[];
					isbn_13: string[];
					isbn_10: string[];
					languages: {
						key: string;
					};
					pagination: string;
					publish_date: string;
					publishers: string[];
					source_records: string[];
					title: string;
					full_title: string;
					key: string;
					created: {
						type: string;
						value: string;
					};
					last_modified: {
						type: string;
						value: string;
					};
					number_of_pages: number;
					physical_format: string;
					covers: number[];
					identifiers: {
						goodreads: string[];
						librarything: string[];
					};
					description: {
						type: string;
						value: string;
					};
					latest_revision: number;
					revision: number;
					publish_places: string[];
					dewey_decimal_class: string[];
					publish_country: string;
				}[];
			} = await (await fetch(url)).json();

			//console.log('editionsResponse' + JSON.stringify(editionsResponse));

			// If no editions are found, return a 404
			if (
				!editionsResponse.entries ||
				(editionsResponse.entries.length == 0 && bookMetaData.length == 0)
			) {
				return bookMetaData;
			}

			bookMetaData = editionsResponse.entries
				.filter(entry => {
					return (
						entry.type.key == '/type/edition' &&
						entry.authors != null &&
						(entry.languages == null ||
							entry.languages.some(language => language.key == '/languages/eng')) &&
						!(entry.covers == undefined || entry.covers == null) &&
						(entry.covers = entry.covers.filter(cover => cover != undefined && cover != null && cover > 0)).length > 0
					);
				})
				.map(entry => {
					return {
						name: entry.title,
						link: `${baseUrl}${entry.key}`,
						authors: entry.authors.map(author => author.key),
						authorLinks: entry.authors.map(author => `${baseUrl}${author.key}`),
						published: entry.publish_date,
						publishers: entry.publishers,
						covers: entry.covers,
						languages: entry.languages,
						physicalFormat: entry.physical_format,
						pages: entry.number_of_pages,
						isbn:
							entry.isbn_13 && entry.isbn_13.length > 0
								? entry.isbn_13[0]
								: entry.isbn_10 && entry.isbn_10.length > 0
								? entry.isbn_10[0]
								: null,
						description: entry.description?.value,
						deweyDecimalClass: entry.dewey_decimal_class,
						publishCountry: entry.publish_country,
						latestRevision: entry.latest_revision,
						identifiers: entry.identifiers?.goodreads,
					};
				});

			if (editionsResponse.links.next) {
				url = baseUrl + editionsResponse.links.next;
			} else {
				break;
			}
		}

		// If no editions are found, return a 404
		if (bookMetaData.length == 0) {
			return bookMetaData;
		}

		// Sort the editions by their publish date
		bookMetaData.sort((a, b) => {
			if (a.published < b.published) {
				return -1;
			} else if (a.published > b.published) {
				return 1;
			} else {
				return 0;
			}
		});
	} else {
		//console.log('overrideData' + overrideData);
		bookMetaData.push(JSON.parse(overrideData) as BookMetaData);
	}

	return bookMetaData;
}

async function getBestBook(
	workId: string,
	env: Env,
	bypassCache: boolean = false
): Promise<BookMetaData> {
	return (await getBestBooks(workId, env, bypassCache))[0];
}

const BestEdition = async (request: IRequest, env: Env) => {
	const bypassCache = request.query['bypassCache'] == 'true';
	// Take an work ID from the request path
	const workId = request.query['workId'];

	// If no work ID is provided, return a 400
	if (!workId) {
		return new Response('Please provide a work ID', { status: 400 });
	}

	var bookMetaData: BookMetaData[] = await getBestBooks(workId.toString(), env, bypassCache);

	// Try deleting formats we don't want
	const bookMetaDataWithFormats = bookMetaData.filter(book => {
		// delete the formats we don't want (CD, AUDIO), be sure to be case insensitive
		if (book.physicalFormat) {
			var format = book.physicalFormat.toUpperCase();
			
			if (format.includes('CD') || format.includes('AUDIO')) {
				return false;
			} else {
				return true;
			}
		}
	});
	
	if (bookMetaDataWithFormats.length > 0) {
		bookMetaData = bookMetaDataWithFormats;
	}

	console.log('bookMetaData' + JSON.stringify(bookMetaDataWithFormats));

	// console.log(request.query['render']);
	// console.log(request.query['render']);
	if (request.query['render'] && request.query['render'] == 'true') {
		// Render the book metadata as HTML
		const bookMetaDataHtml = bookMetaData
			.map(book => {
				// create the html for all the covers
				const coversHtml = book.covers.map(cover => {
					var json = JSON.stringify(book);
					var encodedJson = encodeURIComponent(json);
					return `<a href="https://dacubeking.com/readingedit/editTitle?workId=${workId}&overrideData=${encodedJson}&cover=${cover}">
						<img src="${getCover('' + cover)}" />
					</a>`;
				});

				return `
                <div class="book">
					${coversHtml.join('')}
                    <div class="info">
                        <div class="title">
                            <a href="${book.link}">${book.name}</a>
                        </div>
                        <div class="author">
                            by ${getAuthorLinks(book)}
                        </div>
                        <div class="published">
                            ${book.published}
                        </div>
						<div class="publisher">
							${book.publishers?.join(', ')}
						</div>
						<div class="physical_format">
							Physical Format: ${book.physicalFormat}
						</div>
						<div class="pages">
							pages: ${book.pages}
						</div>
						<div class="isbn">
							ISBN: ${book.isbn}
						</div>
						<div class="description">
							Description: ${book.description}
						</div>
						<div class="dewey_decimal_class">
							Dewey Decimal: ${book.deweyDecimalClass}
						</div>
						<div class="publish_country">
							Publish Country: ${book.publishCountry}
						</div>
						<div class="latest_revision">
							Latest Revision: ${book.latestRevision}
						</div>
						<div class="identifiers">
							Identifiers: ${book.identifiers}
						</div>
						<div class="languages">
							Languages: ${book.languages}
						</div>
						<div class="covers">
							Covers: ${book.covers}
						</div>
                    </div>
                </div>
            `;
			})
			.join('');
		const html = `
        <html>
            <head>
                <title>Best Edition</title>
                <style>
                    body {
                        font-family: sans-serif;
                    }
                    .book {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        margin-bottom: 1em;
                    }
                    .book img {
                        height: 300px;
                        margin-right: 1em;
                    }
                    .book .info {
                        display: flex;
                        flex-direction: column;
                    }
                    .book .info .title {
                        font-weight: bold;
                        font-size: 1.2em;
                    }
                    .book .info .author {
                        font-style: italic;
                    }
                    .book .info .published {
                        font-size: 0.8em;
                    }
                </style>
            </head>
            <body>
                <h1>Best Edition</h1>
                ${bookMetaDataHtml}}
            </body>
        </html>
        `;

		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Content-type': 'text/html',
		};

		return new Response(html, { headers });
	} else {
		// Try seeing if we can remove all editions that have no description
		const bookMetaDataWithDescription = bookMetaData.filter(book => book.description != null);
		if (bookMetaDataWithDescription.length > 0) {
			bookMetaData = bookMetaDataWithDescription;
		}

		// Try seeing if we can remove all editions that have no pages
		const bookMetaDataWithPages = bookMetaData.filter(book => book.pages != null);
		if (bookMetaDataWithPages.length > 0) {
			bookMetaData = bookMetaDataWithPages;
		}

		// Try seeing if we can remove all editions that have no physical format
		const bookMetaDataWithPhysicalFormat = bookMetaData.filter(book => book.physicalFormat != null);
		if (bookMetaDataWithPhysicalFormat.length > 0) {
			bookMetaData = bookMetaDataWithPhysicalFormat;
		}

		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Content-type': 'text/json',
		};
		return new Response(JSON.stringify(bookMetaData[0]), { headers });
	}
};

const EditBestEdition = async (request: IRequest, env: Env) => {
	// get the workId parameter from the request
	const workId = request.query['workId'];

	// get the overrideData parameter from the request
	const overrideData = request.query['overrideData'];

	const cover = request.query['cover'];

	if (overrideData == null || overrideData == '' || overrideData == undefined) {
		return new Response('No override data', { status: 400 });
	}

	if (workId == null || workId == '' || workId == undefined) {
		return new Response('No workId', { status: 400 });
	}

	if (cover == null || cover == '' || cover == undefined) {
		return new Response('No cover', { status: 400 });
	}

	var data = JSON.parse(overrideData);

	data.covers = [cover];

	// put the overrideData into the KV store
	await env.BOOKS.put(bookOverridesKV + workId, overrideData.toString());
	await env.BOOKS.put("haveRead", "");
	// Show a success message, then redirect to dacubeking.com/readingedit/reading
	return new Response(
		`<html>
			<head>
				<title>Success</title>
				<meta http-equiv="refresh" content="0; url=https://dacubeking.com/readingedit/reading" />
			</head>
			<body>
				<h1>Success</h1>
				<p>Redirecting to <a href="https://dacubeking.com/readingedit/reading">https://dacubeking.com/readingedit/reading</a></p>
			</body>
		</html>`,
		{ headers: { 'Content-type': 'text/html' } }
	);
};

export { BestEdition, EditBestEdition, getBestBook };

function getAuthorLinks(book: BookMetaData) {
	return book.authors
		.map((author, index) => `<a href="${book.authorLinks[index]}">${author}</a>`)
		.join(', ');
}
