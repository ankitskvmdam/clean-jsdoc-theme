
function search(list, key, search_key){
    var options = {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "title"
        ]
      };
      var fuse = new Fuse(list, options); // "list" is the item array
      var result = fuse.search(search_key);
      var search = document.getElementById("search-item-ul")
      search.innerHTML = ""
      result.forEach(function(item){
          search.innerHTML+="<li>"+item.link+"</li>";
      });
}
