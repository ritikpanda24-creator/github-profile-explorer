
const usernameInput = document.getElementById("username");
const searchBtn = document.getElementById("searchBtn");
const profileContainer = document.getElementById("profileContainer");
const reposContainer = document.getElementById("reposContainer");
const repoSection = document.getElementById("repoSection");
const message = document.getElementById("message");
const historyContainer = document.getElementById("historyContainer");

const API_URL = "https://api.github.com/users/";

// Search button event
searchBtn.addEventListener("click", searchUser);

// Enter key event
usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchUser();
    }
});

// Extract username from username or GitHub URL
function extractUsername(value) {
    let input = value.trim();

    if (!input) {
        throw new Error("Please enter a GitHub username or URL!");
    }

    // Handle full GitHub profile URLs
    if (/^(https?:\/\/)?(www\.)?github\.com\//i.test(input)) {
        const url = new URL(
            input.startsWith("http") ? input : `https://${input}`
        );

        if (
            url.hostname !== "github.com" &&
            url.hostname !== "www.github.com"
        ) {
            throw new Error("Invalid GitHub URL!");
        }

        input = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (input.includes("://") || input.includes("/")) {
        throw new Error("Please enter a valid GitHub username or URL!");
    }

    // Remove @ prefix
    input = input.replace(/^@/, "");

    // Validate GitHub username
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(input)) {
        throw new Error("Invalid GitHub username!");
    }

    return input;
}

// Search GitHub user
async function searchUser() {
    try {
        const username = extractUsername(usernameInput.value);
        await getGitHubProfile(username);

    } catch (error) {
        showMessage(error.message);
    }
}

// Fetch profile and repositories
async function getGitHubProfile(username) {
    try {
        searchBtn.disabled = true;
        searchBtn.textContent = "Loading...";

        message.textContent = "Fetching GitHub profile...";
        profileContainer.innerHTML = "";
        reposContainer.innerHTML = "";
        repoSection.classList.add("hidden");

        // Fetch user profile
        const profileResponse = await fetch(
            `${API_URL}${encodeURIComponent(username)}`
        );

        if (!profileResponse.ok) {
            if (profileResponse.status === 404) {
                throw new Error("GitHub user not found!");
            }

            if (profileResponse.status === 403 || profileResponse.status === 429) {
                throw new Error("GitHub API rate limit reached. Please try again later.");
            }

            throw new Error("Unable to fetch GitHub profile.");
        }

        const user = await profileResponse.json();

        displayProfile(user);

        // Fetch repositories
        const reposResponse = await fetch(
            `${API_URL}${encodeURIComponent(username)}/repos?sort=updated&per_page=100`
        );

        if (!reposResponse.ok) {
            throw new Error("Unable to fetch repositories.");
        }

        const repos = await reposResponse.json();

        displayRepositories(repos);

        // Save search history
        saveSearchHistory(username);

        message.textContent = "";

    } catch (error) {
        showMessage(error.message);
        profileContainer.innerHTML = "";
        reposContainer.innerHTML = "";
        repoSection.classList.add("hidden");

    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = "Search";
    }
}

// Display GitHub profile
function displayProfile(user) {
    profileContainer.innerHTML = `
        <div class="profile-card">

            <img
                src="${escapeHTML(user.avatar_url)}"
                alt="GitHub Profile Picture"
            >

            <h2>${escapeHTML(user.name || user.login)}</h2>

            <p class="username">
                @${escapeHTML(user.login)}
            </p>

            <p class="bio">
                ${escapeHTML(user.bio || "No bio available")}
            </p>

            <div class="stats">

                <div class="stat-box">
                    <strong>${user.followers}</strong>
                    Followers
                </div>

                <div class="stat-box">
                    <strong>${user.following}</strong>
                    Following
                </div>

                <div class="stat-box">
                    <strong>${user.public_repos}</strong>
                    Repositories
                </div>

            </div>

            <a
                href="${escapeHTML(user.html_url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="profile-link"
            >
                View GitHub Profile
            </a>

        </div>
    `;
}

// Display repositories
function displayRepositories(repos) {
    repoSection.classList.remove("hidden");

    if (repos.length === 0) {
        reposContainer.innerHTML =
            "<p>No public repositories found.</p>";
        return;
    }

    reposContainer.innerHTML = repos.map(repo => `
        <div class="repo-card">

            <h3>
                <a
                    href="${escapeHTML(repo.html_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(repo.name)}
                </a>
            </h3>

            <p>
                ${escapeHTML(
                    repo.description || "No description available"
                )}
            </p>

            <p class="repo-meta">
                Language: ${escapeHTML(repo.language || "Not specified")}
            </p>

            <p class="repo-meta">
                ⭐ Stars: ${repo.stargazers_count}
            </p>

            <p class="repo-meta">
                🍴 Forks: ${repo.forks_count}
            </p>

        </div>
    `).join("");
}

// Save recently searched profiles
function saveSearchHistory(username) {
    let history = JSON.parse(
        localStorage.getItem("githubHistory") || "[]"
    );

    history = history.filter(
        item => item.toLowerCase() !== username.toLowerCase()
    );

    history.unshift(username);

    history = history.slice(0, 5);

    localStorage.setItem(
        "githubHistory",
        JSON.stringify(history)
    );

    displaySearchHistory();
}

// Display recent searches
function displaySearchHistory() {
    const history = JSON.parse(
        localStorage.getItem("githubHistory") || "[]"
    );

    historyContainer.innerHTML = "";

    if (history.length === 0) {
        historyContainer.textContent = "No recent searches.";
        return;
    }

    history.forEach(username => {
        const item = document.createElement("span");

        item.className = "history-item";
        item.textContent = username;

        item.addEventListener("click", () => {
            usernameInput.value = username;
            getGitHubProfile(username);
        });

        historyContainer.appendChild(item);
    });
}

// Display errors
function showMessage(text) {
    message.textContent = text;
}

// Escape API data before inserting into HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Load recent searches on page load
displaySearchHistory();
