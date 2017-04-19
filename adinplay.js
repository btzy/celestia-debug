var AdInPlay={
    showVideoAd:function(callback){
        callback();
    }
};

function initAipPreroll() {
    if(typeof aipPlayer !== "undefined") {
        var complete_callback=undefined;
        var remove_callback=undefined;
        var videoElement=document.getElementById("adinplay-preroll");
        if(!videoElement){
            videoElement=document.createElement("div");
            var videoStyle=videoElement.style;
            videoStyle.setProperty("position","absolute");
            videoStyle.setProperty("z-index","999");
            videoStyle.setProperty("left","0");
            videoStyle.setProperty("right","0");
            videoStyle.setProperty("top","0");
            videoStyle.setProperty("bottom","0");
            videoStyle.setProperty("display","none");
            document.body.appendChild(videoElement);
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
                callback();
            };
            remove_callback=function(){
                document.getElementById("adinplay-preroll").style.setProperty("display","none");
            };
            videoElement.style.setProperty("display","block");
            adplayer.startPreRoll();
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

getScript('http://api.adinplay.com/player/v2/CLS/celestia.io/player.min.js', initAipPreroll);