
function hideSearchList(){
  document.getElementById("search-item-ul").style.display = "none";
}

function showSearchList(){  
  document.getElementById("search-item-ul").style.display = "block";
}

function checkClick(e){
  if( e.target.id != "search-box"){
    this.setTimeout(function(){
      hideSearchList()
    }, 60);
    
    window.removeEventListener('click', checkClick)
  }
}

function setupSearch(){
  var input_box = document.getElementById("search-box");
  var keys = ["title"]

  input_box.addEventListener('keyup', function(){
    if(input_box.value != ""){ 
      showSearchList();
      search(list, keys, input_box.value)
    }
    else hideSearchList();
  })

  input_box.addEventListener('focus', function(){
    showSearchList();
    if(input_box.value != "") search(list, keys, input_box.value)
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
      
      search.innerHTML = "";

      if (result.length == 0) {
        search.innerHTML+="<li> No Result Found </li>";
      } else {
        result.forEach(function(item){
          search.innerHTML+="<li>"+item.link+"</li>";
        });
      }
}
