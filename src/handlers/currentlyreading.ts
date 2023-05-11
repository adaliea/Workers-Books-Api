const init = {
	headers: {
		'content-type': 'application/json;charset=UTF-8',
	},
};

const host = 'https://openlibrary.org';
const url = host + '/people/dacubeking5259/books/currently-reading.json';

class Book {
	name!: string
	link!: string
  author!: string
}

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response) {
	const { headers } = response;
	const contentType = headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		return JSON.stringify(await response.json());
	}
	return response.text();
}

function combineList(list : string[]) {
  var out = ""

  // combine all of the elements into a nicely formatted string with commas and an "&"
  // be sure not to add "&" if there is only one element in the list
  for (var i = 0; i < list.length; i++) {
    if (i == 0) {
      out += list[i]
    } else if (i == list.length - 1) {
      out += " & " + list[i]
    } else {
      out += ", " + list[i]
    }
  }

  return out
}

const CurrentlyReading = async request => {
	const response = await fetch(url, init);

	const json = await response.json();

	let books: Book[] = [];


	json.reading_log_entries.forEach((bookJson: { work: { title: any;  key: any; author_names: string[]; }; }) => {
    books.push(
       {
        name : bookJson.work.title,
        link : host + bookJson.work.key,
        author : combineList(bookJson.work.author_names)
       }
    )
	});

  console.log(books)
	const body = combineList(books.map(book => `<a href="${book.link}">${book.name} by ${book.author}</a>`));
	const headers = { 'Content-type': 'text/html' };
	return new Response(body, { headers });
};

export default CurrentlyReading;
