import { IRequest } from 'itty-router';
import { Env } from '..';

const READ_KEY = "READING_LIST";

const GOOGLE_BOOKS_UID = "117863623315850851352"
const ALREADY_READ = `https://books.google.com/books?jscmd=ClBrowse&as_coll=4&uid=${GOOGLE_BOOKS_UID}`
const CURRENTLY_READING = `https://books.google.com/books?jscmd=ClBrowse&as_coll=3&uid=${GOOGLE_BOOKS_UID}`


class BookMetaData {
  name!: string;
  link!: string;
  authors!: string[];
  authorLinks!: string[];
  published!: string;
  coverLink!: string;
  loggedDate!: string;
  workId!: string;
  list!: string;
  pages!: number | undefined;
  percentComplete: number = 0;
}

export interface GoogleBooksMeta {
	id: number
	title: string
	description: string
	num_volumes: number
	volumes: Volume[]
	can_modify_metadata: boolean
	predefined: boolean
	access: number
	can_remove_volumes: boolean
	can_add_volumes: boolean
}

export interface Volume {
	title: string
	authors: string
	bib_key?: string
	pub_date: string
	snippet: string
	subject?: string
	info_url: string
	preview_url: string
	thumbnail_url?: string
	num_pages?: number
	viewability: number
	preview: string
	embeddable: boolean
	list_price?: string
	sale_price?: string
	buy_url?: string
	is_ebook?: boolean
	preview_ebook_url?: string
	add_to_my_ebooks_url?: string
	my_ebooks_url: string
	sale_price_better?: boolean
	has_flowing_text?: boolean
	can_download_pdf: boolean
	can_download_epub: boolean
	is_pdf_drm_enabled: boolean
	is_epub_drm_enabled: boolean
	subtitle?: string
	has_scanned_text?: boolean
}


function getCover(coverUrl: string) {
  const parsedUrl = new URL(coverUrl);
  parsedUrl.searchParams.set('edge', "0");
  //parsedUrl.searchParams.set('zoom', "4");
  return parsedUrl.toString().replace("http://", "https://");
}

const init = {
  headers: {
    "content-type": "application/json;charset=UTF-8",
  },
};

const ALREADY_READ_KEY = "Already Read";
const CURRENTLY_READING_KEY = "Currently Reading";

const UpdateRead = async (env: Env) => {
  // keep getting pages until we get to the end
  let books: BookMetaData[] = [];

  console.log("Updating read books");
  for (let [listLink, listName] of [
    [CURRENTLY_READING, CURRENTLY_READING_KEY],
    [ALREADY_READ, ALREADY_READ_KEY],
  ]) {
    let maxResults = 1000;
    for (let i = 0; i < maxResults; i += 50) {
      let bookJson = await fetch(`${listLink}&num=50&start=${i}&hl=en`).then(
        (res) => res.json() as Promise<GoogleBooksMeta>
      );

      maxResults = bookJson.num_volumes;

      console.log("bookJson: " + JSON.stringify(bookJson));

      await Promise.all(bookJson.volumes.map(async (book) => {
				let percentComplete;
				let bookCover;
				if (!book.thumbnail_url) {
					bookCover = "https://dummyimage.com/600x900/fff/000&text=fea";
				} else {
					bookCover = book.thumbnail_url;
				}
				if (!bookCover) {
					bookCover = "https://dummyimage.com/600x900/fff/000&text=fea";
				}


				let splitDate = book.pub_date.split(',');
				let date;
				if (splitDate.length === 1) {
					date = splitDate[0];
				} else {
					let mon_day = splitDate[0].split(' ');
					date = mon_day[0] + ' ' + splitDate[1];
				}

				let previewLink = new URL(book.preview_url);
				previewLink.searchParams.set('printsec', "0");
				let previewLinkString = previewLink.toString().replace(previewLink.origin, "https://books.google.com");


				let bookMetaData = new BookMetaData();
				books.push(bookMetaData);
				bookMetaData.name = book.title;
				bookMetaData.link = previewLinkString;
				bookMetaData.authors = [book.authors];
				bookMetaData.authorLinks = bookMetaData.authors.map((author) =>
					`https://www.google.com/search?q=${author}`
				);
				bookMetaData.published = date;
				bookMetaData.coverLink = getCover(bookCover);

				let infoUrl = new URL(book.info_url)
				bookMetaData.workId = infoUrl.searchParams.get('id') || '';
				bookMetaData.list = listName;
				bookMetaData.pages = book.num_pages;

				if (listName === CURRENTLY_READING_KEY) {
					percentComplete = 0;

					// get the percent complete
					const data = await env.BOOKS.get(bookMetaData.workId + 'progress');
					if (data != null) {
						const json = JSON.parse(data);
						percentComplete = json.percent;

						if (json.totalPages) {
							bookMetaData.pages = json.totalPages;
						}
					}
				}
				bookMetaData.percentComplete = percentComplete;
			}));
    }
  }


  //Sort the books by the logged date

  const sortByLoggedDate = (a: BookMetaData, b: BookMetaData) => {
    if (a.loggedDate === undefined || b.loggedDate === undefined) {
      return 0;
    }
    // Put the currently reading books at the top
    if (a.list === CURRENTLY_READING_KEY && b.list !== CURRENTLY_READING_KEY) {
      return -1;
    }
    if (a.list !== CURRENTLY_READING_KEY && b.list === CURRENTLY_READING_KEY) {
      return 1;
    }
    return new Date(b.loggedDate).getTime() - new Date(a.loggedDate).getTime();
  };

  //Sort the books by the logged date
  books.sort(sortByLoggedDate);

  if (books.length < 1) {
    console.log("No books found");
    return;
  }
  //console.log("books: " + JSON.stringify(books));

  await env.BOOKS.put(READ_KEY, JSON.stringify(books));

  if (books.length < 1) {
    console.log("No books found");
    return;
  }
  //console.log("books: " + JSON.stringify(books));

	const json = JSON.stringify(books);
	const current = await env.BOOKS.get(READ_KEY);

	if (json != current) {
    // We have less writes than reads, so we can save some usage by only writing if the data has changed
    await env.BOOKS.put(READ_KEY, json);
  }
};

const Read = async (request: IRequest, env: Env) => {
  let json;
	let shouldBypassCache = request.query["bypassCache"] === "true";
  if (!shouldBypassCache) {
		json = await env.BOOKS.get(READ_KEY);
	}

  if (shouldBypassCache || json === undefined || json === null || json === '') {
    await UpdateRead(env);
		json = await env.BOOKS.get(READ_KEY);
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-type': 'application/json; charset=UTF-8',
  };

  return new Response(json, { headers });
};

const getReadBooks = async (env: Env, bypassCache = false): Promise<BookMetaData[]> => {
  let json;
	if (!bypassCache) {
		json = await env.BOOKS.get(READ_KEY);
	}

  if (bypassCache || json === undefined || json === null || json === '') {
    await UpdateRead(env);
    json = await env.BOOKS.get(READ_KEY);
  }

  if (json == null) {
    return [] as BookMetaData[]
  }

  return JSON.parse(json)
}

export { UpdateRead, Read, getCover, getReadBooks };
