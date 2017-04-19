window.addEventListener("load",function(){
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.type="text/javascript";
      js.src = "https://vk.com/js/api/share.js?94";
      js.charset="windows-1251";
      js.addEventListener("load",function(){
          d.getElementById("vk-share-button").innerHTML = 
              VK.Share.button({ url: "http://celestia.io/",image: "http://celestia.io/celestiaio.png"}, {type: "custom", text:'<div class="vklink"><div class="vklinkinner">Share</div></div>'});
      });
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'vk-jssdk'));
});
