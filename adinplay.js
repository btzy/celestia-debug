var AdInPlay={
    showVideoAd:function(callback){
        callback();
    }
};

function initAipPreroll() {
    if(typeof aipPlayer !== "undefined") {
        var complete_callback=undefined;
        var remove_callback=undefined;
        var wrappingElement=document.getElementById("adinplay-wrapper");
        var videoElement;
        if(!wrappingElement){
            wrappingElement=document.createElement("div");
            wrappingElement.id="adinplay-wrapper";
            var wrappingStyle=wrappingElement.style;
            wrappingStyle.setProperty("position","absolute");
            wrappingStyle.setProperty("z-index","999");
            wrappingStyle.setProperty("left","0");
            wrappingStyle.setProperty("right","0");
            wrappingStyle.setProperty("top","0");
            wrappingStyle.setProperty("bottom","0");
            wrappingStyle.setProperty("display","none");
            wrappingStyle.setProperty("pointer-events","none");
            wrappingStyle.setProperty("background-color","rgba(0,0,0,0)");
            wrappingStyle.setProperty("justify-content","center");
            wrappingStyle.setProperty("align-items","center");
            wrappingStyle.setProperty("transition","background-color 1s");
            videoElement=document.createElement("div");
            videoElement.id="adinplay-preroll";
            var videoStyle=videoElement.style;
            videoStyle.setProperty("flex","0 0 auto");
            videoStyle.setProperty("width","960px");
            videoStyle.setProperty("height","540px");
            wrappingElement.appendChild(videoElement);
            document.body.appendChild(wrappingElement);
        }
        else{
            videoElement=document.getElementById("adinplay-preroll");
        }
        var adplayer = new aipPlayer({
            AD_WIDTH: 960,
            AD_HEIGHT: 540,
            AD_FULLSCREEN: false,
            PREROLL_ELEM: videoElement,
            AIP_COMPLETE: function ()  {
                /*******************
                 ***** WARNING *****
                 *******************
                 Please do not remove the PREROLL_ELEM
                 from the page, it will be hidden automaticly.
                 If you do want to remove it use the AIP_REMOVE callback below
                */
                complete_callback();
            },
            AIP_REMOVE: function ()  {
                // Here it's save to remove the PREROLL_ELEM from the page
                // But it's not necessary
                remove_callback();
            }
        });
        AdInPlay.showVideoAd=function(callback){
            complete_callback=function(){
                wrappingElement.style.setProperty("pointer-events","none");
                wrappingElement.style.setProperty("background-color","rgba(0,0,0,0)");
                callback();
            };
            remove_callback=function(){
                wrappingElement.style.setProperty("display","none");
            };
            wrappingElement.style.setProperty("display","flex");
            window.setTimeout(function(){
                if(wrappingElement.style.getPropertyValue("display")==="flex"){
                    wrappingElement.style.setProperty("background-color","rgba(0,0,0,0.5)");
                    wrappingElement.style.setProperty("pointer-events","auto");
                    adplayer.startPreRoll();
                }
                else{
                    callback();
                }
            },16);
            
        };
        
    } else {
        // Failed to load the adslib ads are probably blocked
        // don't call the startPreRoll function.
        // it will result in an error.
    }
}

function getScript (src, callback) {
    var headElm = document.head || document.getElementsByTagName('head')[0];
    var script = document.createElement("script");
    var once = true;
    script.async = "async";
    script.type = "text/javascript";
    script.charset = "UTF-8";
    script.src = src;
    script.onload = script.onreadystatechange = function () {
        if (once && (!script.readyState || /loaded|complete/.test(script.readyState))) {
            once = false;
            callback();
            script.onload = script.onreadystatechange = null;
        }
    };

    headElm.appendChild(script);
}

window.addEventListener("load",function(){
    getScript('http://api.adinplay.com/player/v2/CLS/celestia.io/player.min.js', initAipPreroll);
});