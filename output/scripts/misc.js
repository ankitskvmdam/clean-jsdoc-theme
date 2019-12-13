(function(){
    // capturing all pre element on the page
    var all_pre = document.getElementsByTagName("pre");

    // template of copy to clipboard icon container
    var copy_to_clipboard = '<div class="code-copy-icon-container" id="click-copy"><svg class="sm-icon" alt="click to copy"><use xlink:href="#copy-icon"></use></svg></div>';


    var i, lang_name, classList, lang_name_div;
    for( i = 0; i < all_pre.length; i++){
        // get the list of class in current pre element
        classList = all_pre[i].classList;

        // extract the code language
        lang_name = classList[classList.length - 1].split('-')[1];
        
        if(lang_name != undefined)
            lang_name_div = '<div class="code-lang-name-container"><div class="code-lang-name">'+ lang_name.toLocaleUpperCase() +'</div></div>';
        else lang_name_div = '';
        
        // appending everythin to the current pre element
        all_pre[i].innerHTML += lang_name_div + copy_to_clipboard;
    }
})()