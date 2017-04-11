// browser support required: WebSockets (binary data), ArrayBuffer, requestAnimationFrame, canvas, KeyboardEvent, classList, flexbox
// supported browsers: IE 11, Edge latest, Firefox latest, Chrome latest, Safari latest, Opera latest, iOS Safari latest, Chrome android latest, Firefox android latest, IE Mobile 11
// TODO: need a fallback for globalCompositionOperation='difference', which is not supported in IE11
// TODO: add front page and help

var fontsloaded=false;
var fontsloadedcallbacks=[];


window.addEventListener("load",function(){
    var canvas=document.getElementById("main-canvas");
    var death_callback=function(){
        game_started=false;
        document.getElementById("welcome-panel").classList.remove("hidden");
        name_textbox.focus();
    };
    var dom_game;
    var game_started=false;
    //var game_is_running=false;
    var name_textbox=document.getElementById("name-textbox");
    var chosen_endpoint;
    var found_best=function(){};
    var xhr=new XMLHttpRequest();
    xhr.addEventListener("load",function(e){
        var remote_endpoint_list=JSON.parse(xhr.responseText);
        var endpoint_count;
        var remote_endpoint_list_with_latency=[];
        var ended_wait=false;
        var too_long=false;
        var remote_endpoint_callback=function(){
            if(!ended_wait){
                if(too_long||remote_endpoint_list_with_latency.length==endpoint_count){
                    ended_wait=true;
                    var best_endpoint;
                    var best_val=10000;
                    remote_endpoint_list_with_latency.forEach(function(li){
                        if(li.latency<best_val){
                            best_val=li.latency;
                            best_endpoint=li.endpoint;
                        }
                    });
                    if(best_endpoint){
                        chosen_endpoint=best_endpoint;
                        found_best();
                    }
                    // TODO.
                }
            }
        };
        endpoint_count=Object.keys(remote_endpoint_list).length;
        Object.keys(remote_endpoint_list).forEach(function(geographical_location){
            var remote_endpoint=remote_endpoint_list[geographical_location];
            var re_xhr=new XMLHttpRequest();
            var time_start=Date.now();
            re_xhr.addEventListener("load",function(e){
                remote_endpoint_list_with_latency.push({endpoint:remote_endpoint,latency:Date.now()-time_start});
                remote_endpoint_callback();
            });
            re_xhr.open("GET","http://"+remote_endpoint+"/");
            re_xhr.send();
        });
        setTimeout(function(){
            too_long=true;
            remote_endpoint_callback();
        },3000);
        
    });
    xhr.open("GET","http://182.19.235.218:8080/welcome");
    xhr.send();
    name_textbox.addEventListener("keydown",function(e){
        switch(e.key){
            case "Enter":
                var start_game_handler=function(){
                    if(!game_started){
                        game_started=true;
                        name_textbox.blur();
                        if(dom_game)dom_game.stop();
                        var do_start=function(){
                            dom_game=new DomGame(canvas,death_callback);
                            dom_game.start(chosen_endpoint,name_textbox.value);
                            document.getElementById("welcome-panel").classList.add("hidden");
                        }
                        if(chosen_endpoint){
                            do_start();
                        }
                        else{
                            found_best=function(){
                                found_best=function(){};
                                do_start();
                            }
                        }
                    }
                }
                if(fontsloaded){
                    start_game_handler();
                }
                else{
                    fontsloadedcallbacks.push(start_game_handler);
                }
                break;
        }
    });
    
    // title animation
    var title_flexitem=document.getElementById("flex-item-title");
    var canvas_clipper=document.getElementById("canvas-clipper");
    var title_canvas=document.getElementById("title-canvas");
    var title_ctx=title_canvas.getContext("2d");
    var canvas_device_pixel_scale=window.devicePixelRatio;
    var title_logical_width;
    var title_logical_height;
    var drawing_width=600;
    var drawing_height=drawing_width/3;
    var baseline_height=150;
    var additional_padding=200;
    var resize_handler=function(){
        title_logical_height=Math.min(title_flexitem.offsetHeight,drawing_height);
        title_logical_width=Math.min(title_flexitem.offsetWidth,title_logical_height*drawing_width/drawing_height);
        title_logical_height=Math.ceil(title_logical_width*drawing_height/drawing_width);
        
        canvas_clipper.style.width=title_logical_width+"px";
        canvas_clipper.style.height=title_logical_height+"px";
        title_canvas.style.width=(title_logical_width+additional_padding*2)+"px";
        title_canvas.style.height=(title_logical_height+additional_padding*2)+"px";
        title_canvas.style.left=-additional_padding+"px";
        title_canvas.style.top=-additional_padding+"px";
        title_canvas.width=(title_logical_width+additional_padding*2)*canvas_device_pixel_scale;
        title_canvas.height=(title_logical_height+additional_padding*2)*canvas_device_pixel_scale;
    }
    window.addEventListener("resize",resize_handler);
    resize_handler();
    var title_animrequest_id;
    var get_title_random_color=function(){
        return [128,255,255];
    };
    var to_canvas_color=function(color_arr){
        return "rgb("+Math.round(color_arr[0]).toString()+","+Math.round(color_arr[1]).toString()+","+Math.round(color_arr[2]).toString()+")";
    };
    var to_canvas_color_with_alpha=function(color_arr){
        return "rgb("+Math.round(color_arr[0]).toString()+","+Math.round(color_arr[1]).toString()+","+Math.round(color_arr[2]).toString()+","+color_arr[3].toString()+")";
    };
    var restart_title_animation=function(){
        if(title_animrequest_id)window.cancelAnimationFrame(title_animrequest_id);
        var time_start=Date.now();
        var text_name="celestia";
        var addn_name=".io";
        var text_parts=[];
        var colors=[];
        for(var i=0;i<text_name.length;++i){
            colors.push(get_title_random_color());
            text_parts.push(text_name.charAt(i));
        }
        colors.push(get_title_random_color());
        text_parts.push(addn_name);
        var draw=function(){
            title_ctx.save();
            title_ctx.translate(additional_padding,additional_padding);
            
            title_ctx.scale(title_logical_width/drawing_width*canvas_device_pixel_scale,title_logical_width/drawing_width*canvas_device_pixel_scale);
            
            title_ctx.clearRect(-additional_padding,-additional_padding,drawing_width+2*additional_padding,drawing_height+2*additional_padding);
            
            title_ctx.textAlign="left";
            title_ctx.textBaseline="alphabetic";
            title_ctx.font="168px CandelaBold,sans-serif";
            
            var time_offset=Date.now()-time_start;
            var text_width=title_ctx.measureText(text_name).width;
            for(var i=0;i<text_parts.length;++i){
                title_ctx.font=(i<text_name.length)?"168px CandelaBold,sans-serif":"40px CandelaBold,sans-serif";
                var char_offset_left=(i<text_name.length)?(text_width-title_ctx.measureText(text_name.substr(i)).width+(drawing_width-text_width)/2):((drawing_width+text_width)/2);
                
                // fade in 1s, then change color 1s
                var local_time_offset=time_offset-i*100;
                
                // shadows only
                title_ctx.save();
                title_ctx.shadowOffsetX=1000;
                title_ctx.shadowOffsetY=1000;
                if(local_time_offset<=0){
                    // don't do anything as this character shouldn't come out yet.
                }
                else if(local_time_offset<=1000){
                    // fade in
                    title_ctx.globalAlpha=local_time_offset/1000;
                    var this_color=to_canvas_color(colors[i]);
                    title_ctx.shadowBlur=20+(1000-local_time_offset)/8;
                    title_ctx.shadowColor=this_color;
                    title_ctx.fillText(text_parts[i],char_offset_left-1000,baseline_height-1000);
                }
                else if(local_time_offset<2000){
                    var fraction=(local_time_offset-1000)/1000;
                    var this_color=to_canvas_color([colors[i][0]*(1-fraction)+255*fraction,colors[i][1]*(1-fraction)+255*fraction,colors[i][2]*(1-fraction)+255*fraction]);
                    title_ctx.shadowBlur=20;
                    title_ctx.shadowColor=this_color;
                    title_ctx.fillText(text_parts[i],char_offset_left-1000,baseline_height-1000);
                }
                else{
                    title_ctx.shadowBlur=20;
                    title_ctx.shadowColor="white";
                    title_ctx.fillText(text_parts[i],char_offset_left-1000,baseline_height-1000);
                }
                title_ctx.restore();
                
                // text only
                title_ctx.save();
                if(local_time_offset<=0){
                    // don't do anything as this character shouldn't come out yet.
                }
                else if(local_time_offset<=1000){
                    // fade in
                    title_ctx.globalAlpha=local_time_offset/1000;
                    var this_color=to_canvas_color(colors[i]);
                    title_ctx.shadowOffsetX=1000;
                    title_ctx.shadowOffsetY=1000;
                    title_ctx.shadowBlur=(1000-local_time_offset)/8;
                    title_ctx.shadowColor=this_color;
                    title_ctx.fillText(text_parts[i],char_offset_left-1000,baseline_height-1000);
                }
                else if(local_time_offset<2000){
                    var fraction=(local_time_offset-1000)/1000;
                    var this_color=to_canvas_color([colors[i][0]*(1-fraction)+255*fraction,colors[i][1]*(1-fraction)+255*fraction,colors[i][2]*(1-fraction)+255*fraction]);
                    title_ctx.fillStyle=this_color;
                    title_ctx.fillText(text_parts[i],char_offset_left,baseline_height);
                }
                else{
                    title_ctx.fillStyle="white";
                    title_ctx.fillText(text_parts[i],char_offset_left,baseline_height);
                }
                title_ctx.restore();
            }
            
            // glowing star
            title_ctx.fillStyle="red";
            title_ctx.beginPath();
            title_ctx.arc(462,49,12,-Math.PI,Math.PI);
            title_ctx.closePath();
            title_ctx.fill();
            //var star_x=
            title_ctx.restore();
            return false;
        };
        var handler=function(){
            if(!draw())title_animrequest_id=window.requestAnimationFrame(handler);
            else title_animrequest_id=undefined;
        };
        title_animrequest_id=window.requestAnimationFrame(handler);
    };
    if(fontsloaded){
        restart_title_animation();
    }
    else{
        fontsloadedcallbacks.push(restart_title_animation);
    }
    
    // font loader:
    var fontLoader=new FontLoader(["CandelaBold:n7"],{
        "complete": function(error){
            if (error !== null) {
                console.log("Could not load font.");
            }
            fontsloaded=true;
            fontsloadedcallbacks.forEach(function(callback){
                callback();
            });
            fontsloadedcallbacks=[];
        }
    }, 5000);
    fontLoader.loadFonts();
});
