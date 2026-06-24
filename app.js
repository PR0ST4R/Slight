// === KEEP YOUR CREDENTIALS EXACTLY AS THEY ARE ABOVE THIS LINE ===
const SUPABASE_URL = "https://dmlhjqtfluenzughugyc.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_MX4mK8Sgc-roOBF0eIiXyA_VlvEMQDO"
// === KEEP YOUR SUPABASE CREDENTIALS EXACTLY AS THEY ARE ABOVE THIS LINE ===

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTab = "feed";
let isGuest = false;
let guestName = "";
let currentAuthMode = "";
let cachedProfiles = {};
let videoObserver = null; // IntersectionObserver for autoplay

const defaultGreyLogo = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
      <rect width="512" height="512" rx="140" fill="#27272a" />
      <path d="M 370 140 L 142 140 L 142 256 L 370 256 L 370 372 L 142 372"
            fill="none" stroke="#52525b" stroke-width="54"
            stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="4" />
    </svg>
`;

// ── Video autoplay via IntersectionObserver ──────────────────────────────────
function setupVideoObserver() {
    if (videoObserver) videoObserver.disconnect();
    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('video.post-media').forEach(v => videoObserver.observe(v));
}

function syncNavProfileAvatar(avatarUrl) {
    const el = document.getElementById('navProfileAvatar');
    if (!el) return;
    if (avatarUrl) {
        el.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        el.innerHTML = `<img src="${DEFAULT_PROFILE_IMG}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

window.onload = async () => {
    const largeLogoSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
          <defs>
            <linearGradient id="slightBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2fe" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="140" fill="#09090b" />
          <path d="M 370 140 L 142 140 L 142 256 L 370 256 L 370 372 L 142 372"
                fill="none" stroke="url(#slightBlue)" stroke-width="54"
                stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="4" />
        </svg>
    `;
    const landingLogoContainer = document.getElementById('landingLogoDisplay');
    if (landingLogoContainer) landingLogoContainer.innerHTML = largeLogoSVG;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        isGuest = false;
        showAppUI(session.user);
    }
};

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    document.getElementById('themeToggleBtn').innerText = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
    const homeIcon = document.getElementById('homeNavIcon');
    if (homeIcon) homeIcon.style.filter = isLight ? 'invert(0)' : 'invert(1)';
}

function showAuthForm(mode) {
    currentAuthMode = mode;
    document.getElementById('mainAuthMenu').classList.add('hidden');
    document.getElementById('inputsContainer').classList.remove('hidden');
    document.getElementById('authError').innerText = "";
    if (mode === 'signup') {
        document.getElementById('nameInput').classList.remove('hidden');
        document.getElementById('usernameInput').classList.remove('hidden');
        document.getElementById('formSubmitBtn').innerText = "Create Account";
    } else {
        document.getElementById('nameInput').classList.add('hidden');
        document.getElementById('usernameInput').classList.add('hidden');
        document.getElementById('formSubmitBtn').innerText = "Log In";
    }
}

function resetAuthScreen() {
    currentAuthMode = "";
    document.getElementById('inputsContainer').classList.add('hidden');
    document.getElementById('mainAuthMenu').classList.remove('hidden');
    document.getElementById('authError').innerText = "";
    document.getElementById('nameInput').value = "";
    document.getElementById('usernameInput').value = "";
    document.getElementById('emailInput').value = "";
    document.getElementById('passwordInput').value = "";
}

// ── Post modal with media preview ───────────────────────────────────────────
function togglePostModal() {
    if (isGuest) { alert("Guests cannot create posts! Please create an account."); return; }
    const modal = document.getElementById('postingModal');
    const isHidden = modal.classList.contains('hidden');
    modal.classList.toggle('hidden');
    if (!isHidden) {
        // Closing — clear preview
        document.getElementById('newPostText').value = "";
        document.getElementById('newPostFile').value = "";
        document.getElementById('mediaPreviewArea').innerHTML = "";
    }
}

function handleMediaPreview(input) {
    const file = input.files[0];
    const preview = document.getElementById('mediaPreviewArea');
    preview.innerHTML = "";
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
        preview.innerHTML = `
            <div style="position:relative;margin-top:10px;">
                <video src="${url}" style="width:100%;border-radius:10px;max-height:200px;object-fit:cover;" playsinline controls></video>
                <button onclick="clearMediaPreview()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">✕</button>
            </div>`;
    } else {
        preview.innerHTML = `
            <div style="position:relative;margin-top:10px;">
                <img src="${url}" style="width:100%;border-radius:10px;max-height:200px;object-fit:cover;">
                <button onclick="clearMediaPreview()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">✕</button>
            </div>`;
    }
}

function clearMediaPreview() {
    document.getElementById('newPostFile').value = "";
    document.getElementById('mediaPreviewArea').innerHTML = "";
}

async function handleGuestLogin() {
    isGuest = true;
    guestName = `Slighter #${Math.floor(Math.random() * 8999) + 1000}`;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    document.getElementById('profileNameDisplay').innerText = guestName;
    document.getElementById('profileUsernameDisplay').innerText = "@guest";
    document.getElementById('profileEmailDisplay').innerText = "Guest Session Active";
    document.getElementById('myProfileAvatar').innerHTML = defaultGreyLogo;
    syncNavProfileAvatar(null);
    injectMiniLogo();
    switchTab('feed');
}

function submitAuthForm() {
    if (currentAuthMode === 'signup') handleSignUp();
    else if (currentAuthMode === 'login') handleLogin();
}

async function handleSignUp() {
    const name = document.getElementById('nameInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim().toLowerCase().replace(/\s+/g, '');
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!name || !username || !email || !password) { showError("Please fill in all fields including username."); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { showError("Username must be 3-20 characters: letters, numbers, underscores only."); return; }

    const { data: existing } = await supabaseClient.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existing) { showError("Username is already taken. Please choose another."); return; }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return showError(error.message);

    if (data && data.user) {
        await supabaseClient.from('profiles').insert([{ id: data.user.id, display_name: name, username: username }]);
        isGuest = false;
        showAppUI(data.user);
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    if (!email || !password) return showError("Please fill in both fields.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return showError(error.message);
    isGuest = false;
    showAppUI(data.user);
}

function injectMiniLogo() {
    const smallLogoSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
          <defs>
            <linearGradient id="slightBlueMini" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2fe" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="140" fill="#09090b" />
          <path d="M 370 140 L 142 140 L 142 256 L 370 256 L 370 372 L 142 372"
                fill="none" stroke="url(#slightBlueMini)" stroke-width="64"
                stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="4" />
        </svg>
    `;
    const c = document.getElementById('smallLogoContainer');
    if (c) c.innerHTML = smallLogoSVG;
}

async function showAppUI(user) {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    document.getElementById('profileEmailDisplay').innerText = user.email;

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
        document.getElementById('profileNameDisplay').innerText = profile.display_name;
        document.getElementById('profileUsernameDisplay').innerText = profile.username ? `@${profile.username}` : '';
        renderAvatarElement(document.getElementById('myProfileAvatar'), profile.avatar_url);
        syncNavProfileAvatar(profile.avatar_url);
    } else {
        syncNavProfileAvatar(null);
    }

    const homeIcon = document.getElementById('homeNavIcon');
    if (homeIcon) homeIcon.style.filter = document.body.classList.contains('light-theme') ? 'invert(0)' : 'invert(1)';

    injectMiniLogo();
    resetAuthScreen();
    switchTab('feed');
}

function renderAvatarElement(targetElement, avatarUrl) {
    if (!targetElement) return;
    if (avatarUrl) {
        targetElement.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        targetElement.innerHTML = defaultGreyLogo;
    }
}

async function uploadProfilePicture(input) {
    if (isGuest) return alert("Guests cannot modify system graphics.");
    const file = input.files[0];
    if (!file) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('media-uploads').upload(filePath, file);
    if (uploadError) return alert(uploadError.message);
    const publicUrl = supabaseClient.storage.from('media-uploads').getPublicUrl(filePath).data.publicUrl;
    await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    renderAvatarElement(document.getElementById('myProfileAvatar'), publicUrl);
    syncNavProfileAvatar(publicUrl);
    switchTab(currentTab);
}

async function switchTab(targetTab) {
    currentTab = targetTab;

    ['nav-feed', 'nav-profile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active-nav');
    });
    if (targetTab === 'feed') {
        const el = document.getElementById('nav-feed');
        if (el) el.classList.add('active-nav');
    } else if (targetTab === 'profile') {
        const el = document.getElementById('nav-profile');
        if (el) el.classList.add('active-nav');
    }

    const feedContainer = document.getElementById('feedContainer');
    const profileView = document.getElementById('profileView');
    const userProfileModal = document.getElementById('userProfileModal');
    if (userProfileModal) userProfileModal.classList.add('hidden');

    if (targetTab === 'profile') {
        feedContainer.classList.add('hidden');
        profileView.classList.remove('hidden');
        document.getElementById('appHeaderTitle').innerText = "My Account";
    } else {
        profileView.classList.add('hidden');
        feedContainer.classList.remove('hidden');
        if (targetTab === 'library') {
            document.getElementById('appHeaderTitle').innerText = "Likes Library";
        } else if (targetTab === 'myposts') {
            document.getElementById('appHeaderTitle').innerText = "My Posts";
        } else {
            document.getElementById('appHeaderTitle').innerText = "Slight Feed";
        }
        let uid = null;
        if (!isGuest) {
            const { data } = await supabaseClient.auth.getUser();
            if (data?.user) uid = data.user.id;
        }
        loadUserPosts(uid);
    }
}

async function loadUserPosts(currentUserId) {
    const { data: posts, error: postError } = await supabaseClient
        .from('posts')
        .select('*, likes(*), comments(*), views')
        .order('created_at', { ascending: false });

    if (postError) return console.error(postError);

    if (posts && posts.length > 0) {
        for (const post of posts) {
            await supabaseClient.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', post.id);
        }
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('id, display_name, username, avatar_url');
    if (profiles) profiles.forEach(p => { cachedProfiles[p.id] = p; });

    const container = document.getElementById('feedContainer');
    container.innerHTML = '';
    let processedPosts = posts || [];

    if (currentTab === "library") {
        if (isGuest || !currentUserId) { container.innerHTML = '<p style="padding:20px;color:#a1a1aa;">Log in to view saved items! ❤️</p>'; return; }
        processedPosts = processedPosts.filter(post => (post.likes || []).some(l => l.user_id === currentUserId));
    } else if (currentTab === "myposts") {
        if (isGuest || !currentUserId) { container.innerHTML = '<p style="padding:20px;color:#a1a1aa;">Log in to see your posts! 📝</p>'; return; }
        processedPosts = processedPosts.filter(post => post.user_id === currentUserId);
    }

    if (processedPosts.length === 0) { container.innerHTML = '<p style="padding:20px;color:#a1a1aa;">No posts found here.</p>'; return; }

    processedPosts.forEach(post => {
        const isOwner = !isGuest && currentUserId && post.user_id === currentUserId;

        let mediaHTML = '';
        if (post.media_url) {
            if (post.media_url.toLowerCase().match(/\.(mp4|webm|mov)$/)) {
                // muted + playsinline needed for autoplay to work on mobile
                mediaHTML = `<video src="${post.media_url}" class="post-media" loop playsinline preload="metadata" style="width:100%;border-radius:12px;margin-top:10px;"></video>`;
            } else {
                mediaHTML = `<img src="${post.media_url}" class="post-media" style="width:100%;border-radius:12px;margin-top:10px;">`;
            }
        }

        let author = cachedProfiles[post.user_id] || { display_name: "Unknown", username: null, avatar_url: null };
        const hasLiked = !isGuest && currentUserId && (post.likes || []).some(l => l.user_id === currentUserId);

        let authorAvatarHTML = author.avatar_url
            ? `<img src="${author.avatar_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
            : `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid #2563eb;flex-shrink:0;">${defaultGreyLogo}</div>`;

        // Delete post button — only for owner
        let deletePostBtn = isOwner
            ? `<button onclick="deletePost(${post.id})" style="background:transparent;border:none;color:#ef4444;font-size:12px;cursor:pointer;font-weight:600;">🗑 Delete</button>`
            : '';
        let editButtonHTML = isOwner
            ? `<button onclick="toggleEdit(${post.id})" id="editBtn-${post.id}" class="btn-edit">Edit</button>`
            : '';

        let commentsHTML = '';
        (post.comments || []).forEach(c => {
            const commenter = cachedProfiles[c.user_id] || { display_name: c.user_email ? c.user_email.split('@')[0] : "User", username: null, avatar_url: null };
            const canDeleteComment = !isGuest && currentUserId && (c.user_id === currentUserId || post.user_id === currentUserId);
            let miniAvatarHTML = commenter.avatar_url
                ? `<img src="${commenter.avatar_url}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                : `<div style="width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0;">${defaultGreyLogo}</div>`;
            let deleteCommentBtn = canDeleteComment
                ? `<button onclick="deleteComment(${c.id}, ${post.id})" style="background:transparent;border:none;color:#ef4444;font-size:11px;cursor:pointer;margin-left:auto;padding:0;">✕</button>`
                : '';
            commentsHTML += `
                <div class="comment-item" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                    ${miniAvatarHTML}
                    <div style="flex:1;">
                        <strong style="color:#2563eb;font-size:13px;">${escapeHTML(commenter.display_name)}</strong>
                        <span style="color:var(--text-main);font-size:13px;"> ${escapeHTML(c.content)}</span>
                    </div>
                    ${deleteCommentBtn}
                </div>
            `;
        });

        container.innerHTML += `
            <div class="post-card" id="card-${post.id}">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    ${authorAvatarHTML}
                    <div style="flex:1;display:flex;flex-direction:column;">
                        <span style="font-weight:700;color:var(--text-main);font-size:14px;">${escapeHTML(author.display_name)}</span>
                        <span onclick="openUserProfile('${post.user_id}')" style="font-size:12px;color:#2563eb;cursor:pointer;">@${escapeHTML(author.username || 'unknown')}</span>
                    </div>
                    ${deletePostBtn}
                </div>
                <div class="post-content-area">
                    <p id="text-${post.id}" style="margin:8px 0;color:var(--text-main);">${escapeHTML(post.content)}</p>
                    ${mediaHTML}
                </div>
                <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#a1a1aa;">
                    <span style="display:flex;align-items:center;gap:5px;"><img src="data:image/png;base64,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wARMYEICDgAmBObVTcAETKB2Ava/DAIOAMqoR3thAiZgAiZgAhMRcAAwES6vbAImYAK1E7D/pRBwAFBKTdoPEzABEzABE5iAgAOACWB5VRMwAROonYD9L4eAA4By6tKemIAJmIAJmMDYBBwAjI3KK5qACZhA7QTsf0kEHACUVJv2xQRMwARMwATGJOAAYExQXs0ETMAEaidg/8si4ACgrPq0NyZgAiZgAiYwFgEHAGNh8komYAImUDsB+18aAQcApdWo/TEBEzABEzCBMQg4ABgDklcxARMwgdoJ2P/yCDgAKK9O7ZEJmIAJmIAJjCTgAGAkIq9gAiZgArUTsP8lEnAAUGKt2icTMAETMAETGEHAAcAIQP7ZBEzABGonYP/LJOAAoMx6tVcmYAImYAImsCoBBwCr4vGPJmACJlA7AftfKgEHAKXWrP0yARMwARMwgVUIOABYBY5/MgETMIHaCdj/cgk4ACi3bu2ZCZiACZiACaxIwAHAimj8gwmYgAnUTsD+l0zAAUDJtWvfTMAETMAETGAFAg4AVgDjr03ABEygdgL2v2wCDgDKrl97ZwImYAImYAJDCTgAGIrFX5qACZhA7QTsf+kEHACUXsP2zwRMwARMwASGEHAAMASKvzIBEzCB2gnY//IJOAAov47toQmYgAmYgAksI+AAYBkSf2ECJmACtROw/zUQcABQQy3bRxMwARMwARNYQsABwBIg/mgCJmACtROw/3UQcABQRz3bSxMwARMwARNYRMABwCIc/mACJmACtROw/7UQcABQS03bTxMwARMwARNYQMABwAIYXjQBEzCB2gnY/3oIOACop67tqQmYgAmYgAlcTMABwMUovGACJmACtROw/zURcABQU23bVxMwARMwAROYI+AAYA6EExMwAROonYD9r4uAA4C66tvemoAJmIAJmMAaAg4A1mDwPxMwAROonYD9r42AA4Daatz+moAJmIAJmIAIOAAQBIsJmIAJ1E7A/tdHwAFAfXVuj03ABEzABExg4ADAO4EJmIAJVE/AAGok4ACgxlq3zyZgAiZgAtUTcABQ/S5gACZgArUTsP91EnAAUGe922sTMAETMIHKCTgAqHwHsPsmYAK1E7D/tRJwAFBrzdtvEzABEzCBqgk4AKi6+u28CZhA7QTsf70EHADUW/f23ARMwARMoGICDgAqrny7bgImUDsB+18zAQcANde+fTcBEzABE6iWgAOAaqvejpuACdROwP7XTeD/AwAA//+R7jAdAAAABklEQVQDAN+l/7U/yedbAAAAAElFTkSuQmCC" class="views-icon" alt="views"> ${post.views || 0} views • ${new Date(post.created_at).toLocaleDateString()}</span>
                    ${editButtonHTML}
                </div>
                <div class="engagement-bar" style="display:flex;gap:16px;margin-top:12px;font-size:14px;cursor:pointer;">
                    <span onclick="toggleLike(${post.id}, ${hasLiked})">${hasLiked ? '❤️' : '🖤'} Like (${(post.likes || []).length})</span>
                    <span onclick="toggleCommentsUI(${post.id})">💬 Comments (${(post.comments || []).length})</span>
                </div>
                <div id="commentWrapper-${post.id}" class="hidden" style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                    <div class="comment-section" id="commentSection-${post.id}">${commentsHTML || '<small style="color:#555;">No comments yet</small>'}</div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <input type="text" id="comInput-${post.id}" placeholder="Write a comment..." style="flex:1;padding:6px;border-radius:6px;background:var(--bg-app);border:1px solid var(--border-color);color:var(--text-main);">
                        <button onclick="submitComment(${post.id})" style="padding:6px 12px;border-radius:6px;background:#2563eb;color:#fff;border:none;cursor:pointer;">Send</button>
                    </div>
                </div>
            </div>
        `;
    });

    // Setup autoplay observer after DOM is populated
    setupVideoObserver();
}

// ── Delete post ──────────────────────────────────────────────────────────────
async function deletePost(postId) {
    if (!confirm("Delete this post?")) return;
    let { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('likes').delete().eq('post_id', postId);
    await supabaseClient.from('comments').delete().eq('post_id', postId);
    await supabaseClient.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    loadUserPosts(user.id);
}

// ── Delete comment ───────────────────────────────────────────────────────────
async function deleteComment(commentId, postId) {
    if (!confirm("Delete this comment?")) return;
    await supabaseClient.from('comments').delete().eq('id', commentId);
    let { data: { user } } = await supabaseClient.auth.getUser();
    loadUserPosts(user.id);
}

// ── User profile modal ───────────────────────────────────────────────────────
async function openUserProfile(userId) {
    const modal = document.getElementById('userProfileModal');
    const body = document.getElementById('userProfileBody');
    modal.classList.remove('hidden');
    body.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;">Loading...</p>';

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    const { data: posts } = await supabaseClient
        .from('posts').select('*, likes(*), comments(*), views')
        .eq('user_id', userId).order('created_at', { ascending: false });

    if (!profile) { body.innerHTML = '<p style="color:var(--text-muted);padding:20px;">User not found.</p>'; return; }

    let avatarHTML = profile.avatar_url
        ? `<img src="${profile.avatar_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;">`
        : `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid #2563eb;">${defaultGreyLogo}</div>`;

    let postsHTML = '';
    (posts || []).forEach(post => {
        let mediaHTML = '';
        if (post.media_url) {
            if (post.media_url.toLowerCase().match(/\.(mp4|webm|mov)$/)) {
                mediaHTML = `<video src="${post.media_url}" controls loop playsinline style="width:100%;border-radius:10px;margin-top:8px;"></video>`;
            } else {
                mediaHTML = `<img src="${post.media_url}" style="width:100%;border-radius:10px;margin-top:8px;">`;
            }
        }
        postsHTML += `
            <div style="background:var(--bg-app);border:1px solid var(--border-color);border-radius:12px;padding:12px;margin-top:10px;">
                <p style="color:var(--text-main);margin:0 0 6px 0;">${escapeHTML(post.content)}</p>
                ${mediaHTML}
                <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
                    ❤️ ${(post.likes||[]).length} • 💬 ${(post.comments||[]).length} • <img src="data:image/png;base64,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wARMYEICDgAmBObVTcAETKB2Ava/DAIOAMqoR3thAiZgAiZgAhMRcAAwES6vbAImYAK1E7D/pRBwAFBKTdoPEzABEzABE5iAgAOACWB5VRMwAROonYD9L4eAA4By6tKemIAJmIAJmMDYBBwAjI3KK5qACZhA7QTsf0kEHACUVJv2xQRMwARMwATGJOAAYExQXs0ETMAEaidg/8si4ACgrPq0NyZgAiZgAiYwFgEHAGNh8komYAImUDsB+18aAQcApdWo/TEBEzABEzCBMQg4ABgDklcxARMwgdoJ2P/yCDgAKK9O7ZEJmIAJmIAJjCTgAGAkIq9gAiZgArUTsP8lEnAAUGKt2icTMAETMAETGEHAAcAIQP7ZBEzABGonYP/LJOAAoMx6tVcmYAImYAImsCoBBwCr4vGPJmACJlA7AftfKgEHAKXWrP0yARMwARMwgVUIOABYBY5/MgETMIHaCdj/cgk4ACi3bu2ZCZiACZiACaxIwAHAimj8gwmYgAnUTsD+l0zAAUDJtWvfTMAETMAETGAFAg4AVgDjr03ABEygdgL2v2wCDgDKrl97ZwImYAImYAJDCTgAGIrFX5qACZhA7QTsf+kEHACUXsP2zwRMwARMwASGEHAAMASKvzIBEzCB2gnY//IJOAAov47toQmYgAmYgAksI+AAYBkSf2ECJmACtROw/zUQcABQQy3bRxMwARMwARNYQsABwBIg/mgCJmACtROw/3UQcABQRz3bSxMwARMwARNYRMABwCIc/mACJmACtROw/7UQcABQS03bTxMwARMwARNYQMABwAIYXjQBEzCB2gnY/3oIOACop67tqQmYgAmYgAlcTMABwMUovGACJmACtROw/zURcABQU23bVxMwARMwAROYI+AAYA6EExMwAROonYD9r4uAA4C66tvemoAJmIAJmMAaAg4A1mDwPxMwAROonYD9r42AA4Daatz+moAJmIAJmIAIOAAQBIsJmIAJ1E7A/tdHwAFAfXVuj03ABEzABExg4ADAO4EJmIAJVE/AAGok4ACgxlq3zyZgAiZgAtUTcABQ/S5gACZgArUTsP91EnAAUGe922sTMAETMIHKCTgAqHwHsPsmYAK1E7D/tRJwAFBrzdtvEzABEzCBqgk4AKi6+u28CZhA7QTsf70EHADUW/f23ARMwARMoGICDgAqrny7bgImUDsB+18zAQcANde+fTcBEzABE6iWgAOAaqvejpuACdROwP7XTeD/AwAA//+R7jAdAAAABklEQVQDAN+l/7U/yedbAAAAAElFTkSuQmCC" class="views-icon" alt="views"> ${post.views||0} • ${new Date(post.created_at).toLocaleDateString()}
                </div>
            </div>`;
    });

    body.innerHTML = `
        <div style="text-align:center;padding:20px 20px 12px;">
            ${avatarHTML}
            <h3 style="color:var(--text-main);margin:12px 0 4px 0;">${escapeHTML(profile.display_name)}</h3>
            <p style="color:#2563eb;font-size:14px;margin:0;">@${escapeHTML(profile.username || 'unknown')}</p>
        </div>
        <div style="padding:0 16px 16px;">
            <h4 style="color:var(--text-muted);font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Posts</h4>
            ${postsHTML || '<p style="color:var(--text-muted);">No posts yet.</p>'}
        </div>`;
}

function closeUserProfile() {
    document.getElementById('userProfileModal').classList.add('hidden');
}

function toggleCommentsUI(postId) {
    document.getElementById(`commentWrapper-${postId}`).classList.toggle('hidden');
}

async function toggleLike(postId, hasLiked) {
    if (isGuest) return alert("Guests cannot register interactions.");
    let { data: { user } } = await supabaseClient.auth.getUser();
    if (hasLiked) {
        await supabaseClient.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
        await supabaseClient.from('likes').insert([{ post_id: postId, user_id: user.id }]);
    }
    loadUserPosts(user.id);
}

async function submitComment(postId) {
    if (isGuest) return alert("Guests cannot comment.");
    const input = document.getElementById(`comInput-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    let { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('comments').insert([{ post_id: postId, user_id: user.id, user_email: user.email, content: text }]);
    input.value = "";
    loadUserPosts(user.id);
}

function toggleEdit(postId) {
    const textElement = document.getElementById(`text-${postId}`);
    const editBtn = document.getElementById(`editBtn-${postId}`);
    if (editBtn.innerText === "Edit") {
        textElement.innerHTML = `<textarea id="input-${postId}" style="width:100%;background:var(--bg-app);color:var(--text-main);">${textElement.innerText}</textarea>`;
        editBtn.innerText = "Save";
    } else {
        const val = document.getElementById(`input-${postId}`).value.trim();
        if (val) saveEdit(postId, val);
    }
}

async function saveEdit(postId, newContent) {
    let { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('posts').update({ content: newContent }).eq('id', postId).eq('user_id', user.id);
    loadUserPosts(user.id);
}

async function submitPost() {
    const textInput = document.getElementById('newPostText');
    const fileInput = document.getElementById('newPostFile');
    const content = textInput.value.trim();
    const file = fileInput.files[0];
    if (!content && !file) return;
    let { data: { user } } = await supabaseClient.auth.getUser();
    let publicMediaUrl = null;
    if (file) {
        const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
        await supabaseClient.storage.from('media-uploads').upload(fileName, file);
        publicMediaUrl = supabaseClient.storage.from('media-uploads').getPublicUrl(fileName).data.publicUrl;
    }
    await supabaseClient.from('posts').insert([{ user_id: user.id, content: content, media_url: publicMediaUrl }]);
    textInput.value = ""; fileInput.value = "";
    document.getElementById('mediaPreviewArea').innerHTML = "";
    togglePostModal();
    loadUserPosts(user.id);
}

async function handleLogout() {
    isGuest = false;
    if (videoObserver) videoObserver.disconnect();
    document.getElementById('appScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    resetAuthScreen();
    try { await supabaseClient.auth.signOut(); } catch (err) {}
}

function showError(msg) { document.getElementById('authError').innerText = msg; }
function escapeHTML(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }