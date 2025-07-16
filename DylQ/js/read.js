const API_KEY = '';

let unknown_words = {};

let palabras;
let books = {}; // Saves book and associated page number
let currentBook; // The currently opened book


// Put text from file on screen after clicking on book
function injectText(filePath, elementId, bookName) {
  books = retrieveDict();
  currentBook = bookName;

  // Get correct page number
  if (!(bookName in books)) {
    books[bookName] = 0;
  }

  fetch(filePath)
    .then(response => response.text())
    .then(data => {
      // Sift data into words
      let data_no_new_lines = data.replace(/\r?\n/g, " ");
      palabras = data_no_new_lines.split(" ");

      // Put correct text on screen
      showText(books[currentBook]);
    })
    .catch(error => {
      console.error('Error fetching the text file:', error);
      document.getElementById(elementId).textContent = "Failed to load text file.";
    });
}



// Translate Spanish word into English using API
async function apiTranslateWord(word) {
  try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`, 
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [
                  { role: "user", content: `"${word}" just the translation no extra` }
                ],
                temperature: 1.0,
                top_p: 0.7,
                n: 1,
                stream: false,
                presence_penalty: 0,
                frequency_penalty: 0,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        } else {
            console.error("Request failed with status:", response.status);
            return null;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}

//Clicks on words and unknown words
document.addEventListener("click", async function(event) {
  if (event.target.classList.contains("unknown-word")) {
    //Remove from unknown words
    const button = event.target.closest("button");
    if (!button) return;
    const rawWord = button.childNodes[0].textContent.trim();
    
    const cleanedWord = rawWord.replace(/[^\p{L}]/gu, '');

    delete unknown_words[cleanedWord];
    saveUnknown();
    showText(books[currentBook]);
  } else if (event.target.classList.contains("word")) {
    //Add to unknown words
    const rawWord = event.target.textContent.trim();
    const cleanedWord = rawWord.replace(/[^\p{L}]/gu, '');

    //Skip if it's already stored
    if (!(cleanedWord in unknown_words)) {
      const translation = await apiTranslateWord(cleanedWord);
      if (translation) {
        unknown_words[cleanedWord] = translation;
        saveUnknown();
        showText(books[currentBook]);
      }
    }
  }
});

// Listens for clicks on next page button
const nextPageButton = document.getElementById('next-page-button');
nextPageButton.addEventListener('click', function () {
  books[currentBook]++;
  saveDict();
  showText(books[currentBook]);
});

// Listens for clicks on previous page button
const prevPageButton = document.getElementById('prev-page-button');
prevPageButton.addEventListener('click', function () {
  if (books[currentBook] > 0) {
    books[currentBook]--;
  }
  saveDict();
  showText(books[currentBook]);
});



// Save and load books object to localStorage
function saveDict() {
  const jsonString = JSON.stringify(books);
  localStorage.setItem("saved_books", jsonString);
}

function retrieveDict() {
  const retrievedJsonString = localStorage.getItem("saved_books");
  if (!retrievedJsonString) return {};
  return JSON.parse(retrievedJsonString);
}

// Save and load unknown words
function saveUnknown() {
  const jsonString = JSON.stringify(unknown_words);
  localStorage.setItem("saved_unknown", jsonString);
}

function retrieveUnknown() {
  const retrievedJsonString = localStorage.getItem("saved_unknown");
  if (!retrievedJsonString) return {};
  return JSON.parse(retrievedJsonString);
}

// Show 500 words on the screen per page
function showText(pageNumber) {
  let pageStart = pageNumber * 500;
  let pageEnd = pageStart + 500;
  let container = document.getElementById('book-text-container');
  container.innerHTML = "";
  unknown_words = retrieveUnknown();
  console.log(unknown_words);
  const fragment = document.createDocumentFragment();

  for (let i = pageStart; i < pageEnd && i < palabras.length; i++) {
    let word = palabras[i];
    let cleanedWord = word.replace(/[^\p{L}]/gu, '');
    let btn = document.createElement('button');
    btn.textContent = word;
    btn.classList.add('word');
    btn.id = word;

    if (cleanedWord in unknown_words) {
      btn.classList.add('unknown-word');
      //Putting definition pop up for unknown word
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = unknown_words[cleanedWord];
      
      btn.appendChild(tooltip);
    }

    fragment.appendChild(btn);
    
  }

  container.appendChild(fragment);

  document.getElementById('book-text-container').style.visibility = 'visible';
  document.getElementById('read-button-container').style.visibility = 'visible';

  document.getElementById('page-display').textContent = `Page: ${pageNumber}`;
}
