import { IRequest } from 'itty-router';
import { Env } from '..';

const READ_KEY = "READING_LIST";

const GOOGLE_BOOKS_UID = "117863623315850851352"
const ALREADY_READ = `https://www.googleapis.com/books/v1/users/${GOOGLE_BOOKS_UID}/bookshelves/4/volumes`
const CURRENTLY_READING = `https://www.googleapis.com/books/v1/users/${GOOGLE_BOOKS_UID}/bookshelves/3/volumes`


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
    for (let i = 0; i < maxResults; i += 40) {
      let bookJson: {
        kind: string;
        totalItems: number;
        items: {
          kind: string;
          id: string;
          etag: string;
          selfLink: string;
          volumeInfo: {
            title: string;
            authors: string[];
            publishedDate: string;
            description: string;
            industryIdentifiers: {
              type: string;
              identifier: string;
            }[];
            readingModes: {
              text: boolean;
              image: boolean;
            };
            pageCount: number;
            printType: string;
            categories: string[];
            averageRating: number;
            ratingsCount: number;
            maturityRating: string;
            allowAnonLogging: boolean;
            contentVersion: string;
            previewLink: string;
            panelizationSummary: {
              containsEpubBubbles: boolean;
              containsImageBubbles: boolean;
            };
            imageLinks: {
              smallThumbnail: string;
              thumbnail: string;
            };
          };
        }[];
      } = await fetch(`${listLink}?maxResults=40&startIndex=${i}&langRestrict=en&key=${env.GOOGLE_API_KEY}`).then(
        (res) => res.json()
      );

      maxResults = bookJson.totalItems;

      console.log("bookJson: " + JSON.stringify(bookJson));

      await Promise.all(bookJson.items.map(async (book) => {
				let percentComplete;
				let bookCover;
				if (!book.volumeInfo.imageLinks) {
					bookCover = "https://via.placeholder.com/128x192.png?text=No+Cover";
				} else {
					bookCover = book.volumeInfo.imageLinks.thumbnail;
				}
				if (!bookCover) {
					bookCover = book.volumeInfo.imageLinks.smallThumbnail;
				}
				if (!bookCover) {
					bookCover = "https://via.placeholder.com/128x192.png?text=No+Cover";
				}

				let splitDate = book.volumeInfo.publishedDate.split("-");
				let date;
				if (splitDate.length === 1) {
					date = splitDate[0];
				} else {
					let year = splitDate[0];
					let monthNumber = parseInt(splitDate[1]);
					if (monthNumber < 1 || monthNumber > 12) {
						date = year;
					} else {
						let month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][monthNumber - 1];
						date = `${month} ${year}`;
					}
				}

				let previewLink = new URL(book.volumeInfo.previewLink);
				previewLink.searchParams.set('printsec', "0");
				let previewLinkString = previewLink.toString().replace(previewLink.origin, "https://books.google.com");


				let bookMetaData = new BookMetaData();
				books.push(bookMetaData);
				bookMetaData.name = book.volumeInfo.title;
				bookMetaData.link = previewLinkString;
				bookMetaData.authors = book.volumeInfo.authors;
				bookMetaData.authorLinks = book.volumeInfo.authors.map((author) =>
					`https://www.google.com/search?q=${author}`
				);
				bookMetaData.published = date;
				bookMetaData.coverLink = getCover(bookCover);
				bookMetaData.workId = book.id;
				bookMetaData.list = listName;
				bookMetaData.pages = book.volumeInfo.pageCount;

				if (listName === CURRENTLY_READING_KEY) {
					percentComplete = 0;

					// get the percent complete
					const data = await env.BOOKS.get(book.id + 'progress');
					if (data != null) {
						const json = JSON.parse(data);
						percentComplete = json.percent;
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
