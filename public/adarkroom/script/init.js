// A Dark Room Initialization Script
// Extracted from index.html to comply with Content Security Policy

(function() {
    // 1. IE check
    window.oldIE = false;
    // Note: IE < 9 check omitted or simplified as it's rare now
    
    // 2. Language detection
    // try to read "lang" param's from url
    var lang = decodeURIComponent((new RegExp('[?|&]lang=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
    // if no language requested, try to read it from local storage
    if(!lang){
        try {
            lang = localStorage.lang;
        } catch(e) {}
    }
    // if a language different than english requested, load all translations
    if(lang && lang != 'en'){
        var script = document.createElement('script');
        script.src = 'lang/' + lang + '/strings.js';
        document.head.appendChild(script);
        
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'lang/' + lang + '/main.css';
        document.head.appendChild(link);
    }

    // 3. Saved notification (initially hidden or handled by engine)
    // The original code had: document.write(_("saved."));
    // Since we can't use document.write in async/external scripts easily,
    // we'll let the engine handle it or set it after translation is loaded.
    window.addEventListener('DOMContentLoaded', function() {
        var saveNotify = document.getElementById('saveNotify');
        if (saveNotify && typeof _ === 'function') {
            saveNotify.innerText = _("saved.");
        }
    });
})();
