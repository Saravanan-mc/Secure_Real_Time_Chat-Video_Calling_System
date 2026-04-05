// Theme toggling logic
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

// Check for saved theme preference or system preference
const savedTheme = localStorage.getItem('chatAppTheme');
const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

const currentTheme = savedTheme || (systemPrefersLight ? 'light' : 'dark');

// Apply the theme
if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeIcon) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}

// Toggle logic
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const newTheme = isLight ? 'dark' : 'light';
        
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        
        localStorage.setItem('chatAppTheme', newTheme);
    });
}
