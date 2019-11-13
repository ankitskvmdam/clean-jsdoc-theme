

function checkClick(e){
  if( e.target.id != "search-box"){
    this.setTimeout(function(){
      search("", [""], "");
    }, 60);
    
    window.removeEventListener('click', checkClick)
  }
}

function setupSearch(){
  var input_box = document.getElementById("search-box");
  var keys = ["title"]

  input_box.addEventListener('keyup', function(){
    search(list, keys, input_box.value)
  })

  input_box.addEventListener('focus', function(){
    search(list, keys, input_box.value)
    window.addEventListener("click", checkClick)
  })
}

function search(list, keys, search_key){
    var options = {
        shouldSort: true,
        threshold: 0.4,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: keys
      };
      var fuse = new Fuse(list, options);
      var result = fuse.search(search_key);
      var search = document.getElementById("search-item-ul")
      search.innerHTML = ""
      result.forEach(function(item){
          search.innerHTML+="<li>"+item.link+"</li>";
      });
}
