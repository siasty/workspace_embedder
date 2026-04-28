// Simple test to verify JS loading
console.log("🔥 TEST: workspace_embedder JavaScript is working!");

// Test workspace detection
setTimeout(function() {
    console.log("🔥 TEST: Current URL:", window.location.pathname);
    if (window.location.pathname.startsWith('/app/')) {
        const workspaceName = window.location.pathname.split('/')[2];
        console.log("🔥 TEST: Detected workspace:", workspaceName);
    }
}, 1000);