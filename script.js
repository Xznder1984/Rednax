// State
let timerInterval = null;
let stopwatchInterval = null;
let timerSeconds = 0;
let stopwatchSeconds = 0;
let timerPaused = false;
let stopwatchPaused = false;
let isSearching = false;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const miniSearchInput = document.getElementById('miniSearchInput');
const clearBtn = document.getElementById('clearBtn');
const centerContent = document.getElementById('centerContent');
const resultsContainer = document.getElementById('resultsContainer');
const resultsContent = document.getElementById('resultsContent');
const loadingState = document.getElementById('loadingState');
const toolsGrid = document.getElementById('toolsGrid');
const inlineCalc = document.getElementById('inlineCalc');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Main search input
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });

    // Mini search input
    miniSearchInput.addEventListener('input', handleMiniSearchInput);
    miniSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch(true);
    });

    // Clear button
    clearBtn.addEventListener('click', clearSearch);

    // Logo click to go back home
    document.querySelector('.mini-logo').addEventListener('click', goHome);
});

// Handle main search input
function handleSearchInput(e) {
    const value = e.target.value;
    clearBtn.classList.toggle('visible', value.length > 0);

    if (value.trim() === '') {
        hideInlineCalc();
        return;
    }

    // Check for math expression
    if (isMathExpression(value.trim())) {
        showInlineCalc(value.trim());
    } else {
        hideInlineCalc();
    }
}

// Handle mini search input
function handleMiniSearchInput(e) {
    const value = e.target.value;
    searchInput.value = value;

    if (value.trim() === '') {
        hideInlineCalc();
        return;
    }

    if (isMathExpression(value.trim())) {
        showInlineCalc(value.trim());
    } else {
        hideInlineCalc();
    }
}

// Clear search
function clearSearch() {
    searchInput.value = '';
    miniSearchInput.value = '';
    clearBtn.classList.remove('visible');
    searchInput.focus();
    hideInlineCalc();
}

// Go back to home
function goHome() {
    isSearching = false;
    centerContent.classList.remove('hidden');
    resultsContainer.classList.remove('visible');
    searchInput.value = '';
    miniSearchInput.value = '';
    clearBtn.classList.remove('visible');
    resultsContent.innerHTML = '';
    hideInlineCalc();
}

// Check if URL
function isURL(str) {
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    return urlPattern.test(str) || 
           str.includes('.com') || 
           str.includes('.org') || 
           str.includes('.net') || 
           str.includes('.io') ||
           str.includes('.co') ||
           str.includes('.edu') ||
           str.includes('.gov') ||
           str.includes('.dev');
}

// Check if math expression
function isMathExpression(str) {
    const mathPattern = /^[\d\s\+\-\*\/\(\)\.\^%]+$/;
    return mathPattern.test(str) && /[\+\-\*\/]/.test(str);
}

// Show inline calculator
function showInlineCalc(expression) {
    try {
        const result = evaluateMath(expression);
        document.getElementById('calcExpression').textContent = expression;
        document.getElementById('calcResultValue').textContent = result;
        inlineCalc.classList.add('visible');
    } catch (e) {
        hideInlineCalc();
    }
}

// Hide inline calculator
function hideInlineCalc() {
    inlineCalc.classList.remove('visible');
}

// Evaluate math
function evaluateMath(expression) {
    expression = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    
    try {
        const result = new Function('return ' + expression)();
        if (isNaN(result) || !isFinite(result)) {
            throw new Error('Invalid');
        }
        return Math.round(result * 1000000) / 1000000;
    } catch (e) {
        throw new Error('Invalid');
    }
}

// Perform search
async function performSearch(fromMini = false) {
    const query = (fromMini ? miniSearchInput.value : searchInput.value).trim();
    
    if (!query) return;

    // Sync inputs
    searchInput.value = query;
    miniSearchInput.value = query;

    // Check if URL
    if (isURL(query)) {
        openURL(query);
        return;
    }

    // Check if math
    if (isMathExpression(query)) {
        showInlineCalc(query);
        return;
    }

    // Show results view
    isSearching = true;
    centerContent.classList.add('hidden');
    resultsContainer.classList.add('visible');
    loadingState.classList.add('visible');
    resultsContent.innerHTML = '';

    try {
        const results = await searchWeb(query);
        displayResults(results, query);
    } catch (error) {
        console.error('Search error:', error);
        displayFallbackResults(query);
    } finally {
        loadingState.classList.remove('visible');
    }
}

// Open URL
function openURL(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    window.open(url, '_blank');
}

// Search web
async function searchWeb(query) {
    try {
        const response = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1');
        const data = await response.json();
        
        const results = [];
        
        if (data.Abstract && data.AbstractURL) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL,
                description: data.Abstract
            });
        }
        
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 9).forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text,
                        url: topic.FirstURL,
                        description: topic.Text
                    });
                }
            });
        }
        
        return results;
    } catch (error) {
        return [];
    }
}

// Display results
function displayResults(results, query) {
    if (results.length === 0) {
        displayFallbackResults(query);
        return;
    }

    resultsContent.innerHTML = '';
    results.forEach(result => {
        const item = createResultItem(result);
        resultsContent.appendChild(item);
    });
}

// Display fallback results
function displayFallbackResults(query) {
    const fallback = [
        {
            title: 'Search "' + query + '" on Google',
            url: 'https://www.google.com/search?q=' + encodeURIComponent(query),
            description: 'Find comprehensive results for "' + query + '" on Google'
        },
        {
            title: 'Search "' + query + '" on Bing',
            url: 'https://www.bing.com/search?q=' + encodeURIComponent(query),
            description: 'Discover information about "' + query + '" using Bing'
        },
        {
            title: 'Search "' + query + '" on DuckDuckGo',
            url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
            description: 'Private search results for "' + query + '"'
        },
        {
            title: 'Search "' + query + '" on YouTube',
            url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query),
            description: 'Watch videos about "' + query + '"'
        },
        {
            title: 'Search "' + query + '" on Wikipedia',
            url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(query),
            description: 'Find encyclopedia articles about "' + query + '"'
        }
    ];

    resultsContent.innerHTML = '';
    fallback.forEach(result => {
        const item = createResultItem(result);
        resultsContent.appendChild(item);
    });
}

// Create result item
function createResultItem(result) {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    let domain = '';
    try {
        const url = new URL(result.url);
        domain = url.hostname.replace('www.', '');
    } catch (e) {
        domain = result.url;
    }
    
    item.innerHTML = '<div class="result-header"><img class="result-favicon" src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=32" alt=""><span class="result-domain">' + escapeHtml(domain) + '</span></div><div class="result-title">' + escapeHtml(result.title) + '</div><div class="result-description">' + escapeHtml(result.description) + '</div>';
    
    item.addEventListener('click', function() {
        window.open(result.url, '_blank');
    });
    
    return item;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Calculator Modal
function showCalculator() {
    document.getElementById('calculatorModal').classList.add('visible');
}

function closeCalculator() {
    document.getElementById('calculatorModal').classList.remove('visible');
}

function appendCalc(value) {
    document.getElementById('calcDisplay').value += value;
}

function clearCalc() {
    document.getElementById('calcDisplay').value = '';
}

function calculateResult() {
    const display = document.getElementById('calcDisplay');
    try {
        display.value = evaluateMath(display.value);
    } catch (e) {
        display.value = 'Error';
        setTimeout(function() {
            display.value = '';
        }, 1000);
    }
}

// Timer Modal
function showTimer() {
    document.getElementById('timerModal').classList.add('visible');
}

function closeTimer() {
    document.getElementById('timerModal').classList.remove('visible');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    const hours = parseInt(document.getElementById('hours').value) || 0;
    const minutes = parseInt(document.getElementById('minutes').value) || 0;
    const seconds = parseInt(document.getElementById('seconds').value) || 0;
    
    if (!timerPaused) {
        timerSeconds = hours * 3600 + minutes * 60 + seconds;
    }
    
    if (timerSeconds <= 0) {
        alert('Please set a valid time');
        return;
    }
    
    timerPaused = false;
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(function() {
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.getElementById('timerDisplay').textContent = '00:00:00';
            playSound();
            alert("Time's up!");
            return;
        }
        
        timerSeconds--;
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerPaused = true;
    }
}

function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerSeconds = 0;
    timerPaused = false;
    document.getElementById('hours').value = '0';
    document.getElementById('minutes').value = '5';
    document.getElementById('seconds').value = '0';
    document.getElementById('timerDisplay').textContent = '00:05:00';
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    
    document.getElementById('timerDisplay').textContent = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// Stopwatch Modal
function showStopwatch() {
    document.getElementById('stopwatchModal').classList.add('visible');
}

function closeStopwatch() {
    document.getElementById('stopwatchModal').classList.remove('visible');
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
}

function startStopwatch() {
    if (stopwatchInterval) return;
    
    stopwatchPaused = false;
    
    stopwatchInterval = setInterval(function() {
        stopwatchSeconds++;
        updateStopwatchDisplay();
    }, 1000);
}

function pauseStopwatch() {
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        stopwatchPaused = true;
    }
}

function resetStopwatch() {
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    stopwatchSeconds = 0;
    stopwatchPaused = false;
    document.getElementById('stopwatchDisplay').textContent = '00:00:00';
}

function updateStopwatchDisplay() {
    const hours = Math.floor(stopwatchSeconds / 3600);
    const minutes = Math.floor((stopwatchSeconds % 3600) / 60);
    const seconds = stopwatchSeconds % 60;
    
    document.getElementById('stopwatchDisplay').textContent = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// Utilities
function pad(num) {
    return num.toString().padStart(2, '0');
}

function playSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported');
    }
}
