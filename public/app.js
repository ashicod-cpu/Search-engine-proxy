// This is the frontend logic for the search engine proxy

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results-container');

searchButton.addEventListener('click', () => {
    const query = searchInput.value;
    if (query) {
        fetchResults(query);
    }
});

function fetchResults(query) {
    fetch(`https://api.example.com/search?q=${query}`)
        .then(response => response.json())
        .then(data => displayResults(data))
        .catch(error => console.error('Error fetching results:', error));
}

function displayResults(data) {
    resultsContainer.innerHTML = '';
    data.results.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.className = 'result';
        resultElement.innerHTML = `<h3>${result.title}</h3><p>${result.description}</p>`;
        resultsContainer.appendChild(resultElement);
    });
}