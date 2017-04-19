// browser support required: WebSockets (binary data), ArrayBuffer, requestAnimationFrame, canvas, KeyboardEvent, classList, flexbox
// supported browsers: IE 11, Edge latest, Firefox latest, Chrome latest, Safari latest, Opera latest, iOS Safari latest, Chrome android latest, Firefox android latest, IE Mobile 11
// TODO: need a fallback for globalCompositionOperation='difference', which is not supported in IE11
// TODO: add help
// TODO: blur for title
// TODO: simple mobile support


var name_too_long=function(displayname){
    var encoded_buffer_view=new TextEncoder("utf-8").encode(displayname);
    if(encoded_buffer_view.length>1024){
        return true;
    }
    return false;
};


var fontsloaded=false;
var fontsloadedcallbacks=[];


var hasGlobalCompositeOperationDifference=true;


var lobby_endpoint="http://lobby.celestia.io:8080";


window.addEventListener("load",function(){
    var canvas=document.getElementById("main-canvas");
    
    var welcome_panel=document.getElementById("welcome-panel");
    var welcome_panel_suspendanimation=undefined;
    var ad_wrapper=document.getElementById("ad-wrapper");
    var show_welcome_panel=function(){
        if(welcome_panel_suspendanimation)welcome_panel_suspendanimation();
        var animsuspended=false;
        welcome_panel_suspendanimation=function(){
            animsuspended=true;
        };
        welcome_panel.classList.remove("displaynone");
        window.setTimeout(function(){
            if(!animsuspended){
                welcome_panel.classList.remove("hidden");
                if(googletag.pubads)googletag.pubads().refresh();
                window.setTimeout(function(){
                    if(!animsuspended){
                        ad_wrapper.classList.remove("displaynone");
                        welcome_panel_suspendanimation=undefined;
                    }
                },700);
            }
        },10);
        name_textbox.focus();
    };
    var hide_welcome_panel=function(){
        if(welcome_panel_suspendanimation)welcome_panel_suspendanimation();
        var animsuspended=false;
        welcome_panel_suspendanimation=function(){
            animsuspended=true;
        };
        hide_welcome_panel_ads();
        welcome_panel.classList.add("hidden");
        window.setTimeout(function(){
            if(!animsuspended){
                welcome_panel.classList.add("displaynone");
                welcome_panel_suspendanimation=undefined;
            }
        },1000);
    };
    
    var hide_welcome_panel_ads=function(){
        ad_wrapper.classList.add("displaynone");
    };
    
    
    var death_callback=function(max_mass){
        game_started=false;
        show_welcome_panel();
        if(max_mass)save_max_mass(max_mass,name_textbox.value);
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
                        join_button_drawer.setready();
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
    xhr.open("GET",lobby_endpoint+"/welcome");
    xhr.send();
    
    
    var LOCALSTORAGE_LAST_GAME_ATTEMPT_START_TIME="last-game-attempt-start-time";
    var LOCALSTORAGE_SESSION_GAME_START_COUNT="session-game-start-count";
    var last_game_attempt_start_time=0,session_game_count=0;
    if(window.localStorage){
        last_game_attempt_start_time=parseInt(window.localStorage.getItem(LOCALSTORAGE_LAST_GAME_ATTEMPT_START_TIME))||0;
        session_game_count=parseInt(window.localStorage.getItem(LOCALSTORAGE_SESSION_GAME_START_COUNT))||0;
    }
    if(last_game_attempt_start_time+60000<Date.now()){
        last_game_attempt_start_time=0;
        session_game_count=0;
    }
    
    
    var enter_pressed=function(){
        if(name_too_long(name_textbox.value)){
            alert("Don't try to kill the server!  Your name should be no more than 1024 bytes long.");
            return;
        }
        var start_game_handler=function(){
            if(!game_started){
                game_started=true;
                name_textbox.blur();
                if(dom_game)dom_game.stop();
                var do_start=function(){
                    last_game_attempt_start_time=Date.now();
                    if(window.localStorage){
                        window.localStorage.setItem(LOCALSTORAGE_LAST_GAME_ATTEMPT_START_TIME,last_game_attempt_start_time.toString());
                    }
                    
                    var _really_start_game=function(){
                        ++session_game_count;
                        if(window.localStorage){
                            window.localStorage.setItem(LOCALSTORAGE_SESSION_GAME_START_COUNT,session_game_count.toString());
                        }
                        ga("send","event","game","start",undefined,session_game_count);

                        var options={touch:document.getElementsByClassName("visible")[0].classList.contains("touch"),opposite:document.getElementsByClassName("visible")[0].classList.contains("opposite"),hasGlobalCompositeOperationDifference:hasGlobalCompositeOperationDifference};
                        dom_game=new DomGame(canvas,options,death_callback);
                        dom_game.start(chosen_endpoint,name_textbox.value);
                        hide_welcome_panel();
                    }
                    
                    // adinplay video ad
                    if(session_game_count%5===1){
                        hide_welcome_panel_ads();
                        AdInPlay.showVideoAd(_really_start_game);
                    }
                    else{
                        _really_start_game();
                    }
                }
                if(chosen_endpoint){
                    do_start();
                }
                else{
                    found_best=function(){
                        found_best=function(){};
                        do_start();
                        document.getElementById("flex-item-connecting").classList.add("displaynone");
                        document.getElementById("flex-item-inputmode").classList.remove("displaynone");
                    }
                    document.getElementById("flex-item-inputmode").classList.add("displaynone");
                    document.getElementById("flex-item-connecting").classList.remove("displaynone");
                }
            }
        }
        if(fontsloaded){
            start_game_handler();
        }
        else{
            fontsloadedcallbacks.push(start_game_handler);
        }
    };
    window.addEventListener("keydown",function(e){
        switch(e.key){
            case "Enter":
                enter_pressed();
                e.preventDefault();
                break;
        }
    });
    
    // title animation
    var title_flexitem=document.getElementById("flex-item-title");
    var canvas_clipper=document.getElementById("canvas-clipper");
    var title_canvas=document.getElementById("title-canvas");
    var title_ctx=title_canvas.getContext("2d");
    var canvas_device_pixel_scale=window.devicePixelRatio||1;
    var title_logical_width;
    var title_logical_height;
    var drawing_width=600;
    var drawing_height=drawing_width/3;
    var baseline_height=150;
    var additional_padding=200; // logical width units
    var prerender_canvas_done=false;
    var resize_handler=function(){
        title_flexitem.style.height="200px";
        
        title_logical_height=Math.min(title_flexitem.offsetHeight,drawing_height);
        title_logical_width=Math.min(title_flexitem.offsetWidth,title_logical_height*drawing_width/drawing_height);
        title_logical_height=Math.ceil(title_logical_width*drawing_height/drawing_width);
        
        canvas_clipper.style.width=title_logical_width+"px";
        canvas_clipper.style.height=title_logical_height+"px";
        title_flexitem.style.height=title_logical_height+"px";
        title_canvas.style.width=(title_logical_width+additional_padding*2)+"px";
        title_canvas.style.height=(title_logical_height+additional_padding*2)+"px";
        title_canvas.style.left=-additional_padding+"px";
        title_canvas.style.top=-additional_padding+"px";
        title_canvas.width=(title_logical_width+additional_padding*2)*canvas_device_pixel_scale;
        title_canvas.height=(title_logical_height+additional_padding*2)*canvas_device_pixel_scale;
        prerender_canvas_done=false;
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
        return "rgba("+Math.round(color_arr[0]).toString()+","+Math.round(color_arr[1]).toString()+","+Math.round(color_arr[2]).toString()+","+color_arr[3].toString()+")";
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
        
        var prerender_canvas=document.createElement("canvas");
        
        var draw=function(){
            
            
            title_ctx.save();
            
            title_ctx.clearRect(0,0,(title_logical_width+additional_padding*2)*canvas_device_pixel_scale,(title_logical_height+additional_padding*2)*canvas_device_pixel_scale);
            
            title_ctx.translate(additional_padding*canvas_device_pixel_scale,additional_padding*canvas_device_pixel_scale);
            
            title_ctx.scale(title_logical_width/drawing_width*canvas_device_pixel_scale,title_logical_width/drawing_width*canvas_device_pixel_scale);
            
            
            
            title_ctx.textAlign="left";
            title_ctx.textBaseline="alphabetic";
            title_ctx.font="168px CandelaBold,sans-serif";
            
            var time_offset=Date.now()-time_start;
            var text_width=title_ctx.measureText(text_name).width;
            
            var offset_hide=(Math.max(drawing_width,drawing_height)+(additional_padding*drawing_width/title_logical_width));/*1000;*/
            var shadowOffsetX=offset_hide*title_logical_width/drawing_width*canvas_device_pixel_scale;
            var shadowOffsetY=offset_hide*title_logical_width/drawing_width*canvas_device_pixel_scale;
            
            
            for(var i=0;i<text_parts.length;++i){
                title_ctx.font=(i<text_name.length)?"168px CandelaBold,sans-serif":"40px CandelaBold,sans-serif";
                var char_offset_left=(i<text_name.length)?(text_width-title_ctx.measureText(text_name.substr(i)).width+(drawing_width-text_width)/2):((drawing_width+text_width)/2);
                
                // fade in 1s, then change color 1s
                var local_time_offset=time_offset-i*100;
                
                // special for 'i' to remove the dot:
                if(i===6 && (!prerender_canvas_done || local_time_offset>1000)){
                    prerender_canvas.width=title_canvas.width;
                    prerender_canvas.height=title_canvas.height;
                    var prerender_ctx=prerender_canvas.getContext("2d");
                    
                    prerender_ctx.save();
                    
                    prerender_ctx.clearRect(0,0,(title_logical_width+additional_padding*2)*canvas_device_pixel_scale,(title_logical_height+additional_padding*2)*canvas_device_pixel_scale);
                    prerender_ctx.translate(additional_padding*canvas_device_pixel_scale,additional_padding*canvas_device_pixel_scale);
                      prerender_ctx.scale(title_logical_width/drawing_width*canvas_device_pixel_scale,title_logical_width/drawing_width*canvas_device_pixel_scale);
            
                    
                    /*prerender_ctx.fillStyle="red";
                    prerender_ctx.fillRect(-additional_padding,-additional_padding,drawing_width+2*additional_padding,drawing_height+2*additional_padding);*/

                    prerender_ctx.textAlign="left";
                    prerender_ctx.textBaseline="alphabetic";
                    prerender_ctx.font="168px CandelaBold,sans-serif";
                    if(local_time_offset<=1000){
                        prerender_ctx.fillStyle=to_canvas_color(colors[i]);
                    }
                    else if(local_time_offset<2000){
                        var fraction=(local_time_offset-1000)/1000;
                        var this_color=to_canvas_color([colors[i][0]*(1-fraction)+255*fraction,colors[i][1]*(1-fraction)+255*fraction,colors[i][2]*(1-fraction)+255*fraction]);
                        prerender_ctx.fillStyle=this_color;
                    }
                    else{
                        prerender_ctx.fillStyle="white";
                    }
                    prerender_ctx.fillText(text_parts[i],char_offset_left,baseline_height);
                    prerender_ctx.globalCompositeOperation="destination-out";
                    prerender_ctx.fillStyle="black";
                    prerender_ctx.beginPath();
                    prerender_ctx.arc(462,49,12,-Math.PI,Math.PI);
                    prerender_ctx.closePath();
                    prerender_ctx.fill();
                    prerender_ctx.restore();
                    
                    prerender_canvas_done=true;
                }
                
                
                
                // shadows only
                title_ctx.save();
                // in drawing units
                var offset_hide=(Math.max(drawing_width,drawing_height)+(additional_padding*drawing_width/title_logical_width));/*1000;*/
                title_ctx.shadowOffsetX=shadowOffsetX;
                title_ctx.shadowOffsetY=shadowOffsetY;
                if(local_time_offset<=0){
                    // don't do anything as this character shouldn't come out yet.
                }
                else if(local_time_offset<=1000){
                    // fade in
                    title_ctx.globalAlpha=local_time_offset/1000;
                    var this_color=to_canvas_color(colors[i]);
                    title_ctx.shadowBlur=20+(1000-local_time_offset)/8;
                    title_ctx.shadowColor=this_color;
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left-offset_hide,baseline_height-offset_hide);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width-offset_hide,-additional_padding*drawing_width/title_logical_width-offset_hide,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
                }
                else if(local_time_offset<2000){
                    var fraction=(local_time_offset-1000)/1000;
                    var this_color=to_canvas_color([colors[i][0]*(1-fraction)+255*fraction,colors[i][1]*(1-fraction)+255*fraction,colors[i][2]*(1-fraction)+255*fraction]);
                    title_ctx.shadowBlur=20;
                    title_ctx.shadowColor=this_color;
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left-offset_hide,baseline_height-offset_hide);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width-offset_hide,-additional_padding*drawing_width/title_logical_width-offset_hide,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
                }
                else{
                    title_ctx.shadowBlur=20;
                    title_ctx.shadowColor="white";
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left-offset_hide,baseline_height-offset_hide);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width-offset_hide,-additional_padding*drawing_width/title_logical_width-offset_hide,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
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
                    title_ctx.shadowOffsetX=shadowOffsetX;
                    title_ctx.shadowOffsetY=shadowOffsetY;
                    title_ctx.shadowBlur=(1000-local_time_offset)/8;
                    title_ctx.shadowColor=this_color;
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left-offset_hide,baseline_height-offset_hide);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width-offset_hide,-additional_padding*drawing_width/title_logical_width-offset_hide,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
                }
                else if(local_time_offset<2000){
                    var fraction=(local_time_offset-1000)/1000;
                    var this_color=to_canvas_color([colors[i][0]*(1-fraction)+255*fraction,colors[i][1]*(1-fraction)+255*fraction,colors[i][2]*(1-fraction)+255*fraction]);
                    title_ctx.fillStyle=this_color;
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left,baseline_height);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width,-additional_padding*drawing_width/title_logical_width,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
                }
                else{
                    title_ctx.fillStyle="white";
                    if(i!==6)title_ctx.fillText(text_parts[i],char_offset_left,baseline_height);
                    else title_ctx.drawImage(prerender_canvas,-additional_padding*drawing_width/title_logical_width,-additional_padding*drawing_width/title_logical_width,drawing_width+additional_padding*drawing_width/title_logical_width*2,drawing_height+additional_padding*drawing_width/title_logical_width*2);
                }
                title_ctx.restore();
            }
            
            // glowing star
            title_ctx.save();
            title_ctx.translate(462,49);
            var star_color=[255,255,128];
            if(time_offset<=700){
                // do nothing
            }
            else if(time_offset<2200){
                var st_radius=100;
                
                // angle:-60 to -30:
                var st_start=-60*Math.PI/180;
                var st_end=-30*Math.PI/180;
                
                var mid_x=-Math.cos(st_end)*st_radius;
                var mid_y=-Math.sin(st_end)*st_radius;
                
                var fraction=Math.sin((time_offset-700)/(2200-700)*Math.PI/2);
                
                var current_angle=st_start*(1-fraction)+st_end*fraction;
                
                var curr_x=mid_x+Math.cos(current_angle)*st_radius;
                var curr_y=mid_y+Math.sin(current_angle)*st_radius;
                
                var fraction_linear=(time_offset-700)/(2200-700);
                
                if(title_ctx.ellipse){
                    title_ctx.shadowColor=to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],Math.min(fraction_linear*2,1)]);
                    title_ctx.shadowOffsetX=shadowOffsetX;
                    title_ctx.shadowOffsetY=shadowOffsetY;
                    title_ctx.shadowBlur=60*fraction_linear;
                    var radius=18*fraction_linear;
                    for(var i=0;i<8;++i){
                        var ecc2=0.2;
                        var ecc=Math.sqrt(ecc2);
                        var angle=i*Math.PI/4;
                        var dist=radius*Math.sqrt(1/ecc2-ecc2);
                        title_ctx.beginPath();
                        title_ctx.ellipse(curr_x+Math.cos(angle)*dist-offset_hide,curr_y+Math.sin(angle)*dist-offset_hide,radius/ecc,radius*ecc,angle,-Math.PI,Math.PI);
                        //title_ctx.ellipse(0,0,60,40,angle,0,2*Math.PI);
                        title_ctx.fill();
                    }
                    title_ctx.shadowBlur=30*fraction_linear;
                    title_ctx.beginPath();
                    title_ctx.arc(curr_x-offset_hide,curr_y-offset_hide,24*fraction_linear,-Math.PI,Math.PI);
                    title_ctx.closePath();
                    title_ctx.fill();
                }
                else{
                    var st_gradient=title_ctx.createRadialGradient(curr_x,curr_y,0,curr_x,curr_y,fraction_linear*50);
                    st_gradient.addColorStop(0,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],Math.min(fraction_linear*2,1)]));
                    st_gradient.addColorStop(0.1,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],Math.min(fraction_linear*2,1)]));
                    st_gradient.addColorStop(0.4,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],Math.min(fraction_linear*2,1)*0.7]));
                    st_gradient.addColorStop(0.7,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],Math.min(fraction_linear*2,1)*0.3]));
                    st_gradient.addColorStop(1,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],0]));
                    title_ctx.fillStyle=st_gradient;
                    title_ctx.beginPath();
                    title_ctx.arc(curr_x,curr_y,fraction_linear*50,-Math.PI,Math.PI);
                    title_ctx.closePath();
                    title_ctx.fill();
                }
            }
            else{
                if(title_ctx.ellipse){
                    title_ctx.shadowColor=to_canvas_color(star_color);
                    title_ctx.shadowOffsetX=shadowOffsetX;
                    title_ctx.shadowOffsetY=shadowOffsetY;
                    title_ctx.shadowBlur=60;
                    var radius=18;
                    for(var i=0;i<8;++i){
                        var ecc2=0.2;
                        var ecc=Math.sqrt(ecc2);
                        var angle=i*Math.PI/4;
                        var dist=radius*Math.sqrt(1/ecc2-ecc2);
                        title_ctx.beginPath();
                        title_ctx.ellipse(Math.cos(angle)*dist-offset_hide,Math.sin(angle)*dist-offset_hide,radius/ecc,radius*ecc,angle,-Math.PI,Math.PI);
                        //title_ctx.ellipse(0,0,60,40,angle,0,2*Math.PI);
                        title_ctx.fill();
                    }
                    title_ctx.shadowBlur=30;
                    title_ctx.beginPath();
                    title_ctx.arc(-offset_hide,-offset_hide,24,-Math.PI,Math.PI);
                    title_ctx.closePath();
                    title_ctx.fill();
                }
                else{
                    var st_gradient=title_ctx.createRadialGradient(0,0,0,0,0,50);
                    st_gradient.addColorStop(0,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],1]));
                    st_gradient.addColorStop(0.1,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],1]));
                    st_gradient.addColorStop(0.4,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],0.7]));
                    st_gradient.addColorStop(0.7,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],0.3]));
                    st_gradient.addColorStop(1,to_canvas_color_with_alpha([star_color[0],star_color[1],star_color[2],0]));
                    title_ctx.fillStyle=st_gradient;
                    title_ctx.beginPath();
                    title_ctx.arc(0,0,50,-Math.PI,Math.PI);
                    title_ctx.closePath();
                    title_ctx.fill();
                }
            }
            title_ctx.restore();
            //var star_gradient=title_ctx.createRadialGradient()
            
            /*title_ctx.fillStyle="red";
            title_ctx.beginPath();
            title_ctx.arc(462,49,12,-Math.PI,Math.PI);
            title_ctx.closePath();
            title_ctx.fill();*/
            //var star_x=
            title_ctx.restore();
            
            return time_offset>=Math.max(2200,2000+(text_parts.length-1)*100);
            //return false;
        };
        var handler=function(){
            if(!draw())title_animrequest_id=window.requestAnimationFrame(handler);
            else title_animrequest_id=undefined;
        };
        title_animrequest_id=window.requestAnimationFrame(handler);
        window.addEventListener("resize",function(){
            if(title_animrequest_id===undefined)setTimeout(draw,0);
        });
    };
    if(fontsloaded){
        restart_title_animation();
    }
    else{
        fontsloadedcallbacks.push(restart_title_animation);
    }
    
    
    
    // max mass saver
    // version 1.1.1 = repeat of '|'+(mass as string)
    var save_max_mass=function(max_mass,displayname){
        if(window.localStorage){
            var key="highscore-1.1.1";
            var storedData=window.localStorage.getItem(key)||"";
            storedData+="|"+max_mass.toString()+":"+Date.now().toString()+":"+encodeURIComponent(displayname);
            window.localStorage.setItem(key,storedData);
        }
    };
    // returns array of {displayname:string,mass:integer,timestamp:number} if success, returns false if no localstorage support
    var load_max_mass_history=function(){
        if(window.localStorage){
            var key="highscore-1.1.1";
            var storedData=window.localStorage.getItem(key)||"";
            var arr=[];
            var index=0;
            while(index<storedData.length){
                var nextindex=storedData.indexOf("|",index+1);
                if(nextindex===-1)nextindex=storedData.length;
                var numstring=storedData.substring(index+1,nextindex);
                var parts=numstring.split(":");
                if(parts.length===3){
                    arr.push({mass:parseInt(parts[0]),timestamp:parseFloat(parts[1]),displayname:decodeURIComponent(parts[2])});
                }
                else if(parts.length===2){
                    arr.push({mass:parseInt(parts[0]),timestamp:parseFloat(parts[1]),displayname:""});
                }
                else{
                    arr.push({mass:parseInt(numstring),timestamp:(new Date(2017,2,11)).getTime(),displayname:""}); // 2017 March 11
                }
                index=nextindex;
            }
            return arr;
        }
        else return false;
    }
    
    
    // leaderboard
    var leaderboard_panel=document.getElementById("leaderboard-panel");
    leaderboard_panel.addEventListener("click",function(){
        hide_leaderboard_panel();
    },false);
    document.getElementById("leaderboard-panel-inner-wrapper").addEventListener("click",function(e){
        e.stopPropagation();
    },false);
    var escape_key_event=function(e){
        switch(e.key){
            case "Escape":
            case "Esc":
                hide_leaderboard_panel();
                e.preventDefault();
                break;
        }
    };
    var show_leaderboard_panel=function(){
        leaderboard_panel.classList.remove("displaynone");
        window.setTimeout(function(){
            leaderboard_panel.classList.remove("transparent");
        },10);
        select_leaderboard_header_elem(leaderboard_item_mapping[0]);
        window.addEventListener("keydown",escape_key_event);
    };
    var hide_leaderboard_panel=function(){
        window.removeEventListener("keydown",escape_key_event);
        leaderboard_panel.classList.add("transparent");
        window.setTimeout(function(){
            leaderboard_panel.classList.add("displaynone");
        },700);
    };
    
    var leaderboard_panel_content=document.getElementById("leaderboard-panel-content");
    
    var leaderboard_header_day=document.getElementById("leaderboard-panel-header-day");
    var leaderboard_header_week=document.getElementById("leaderboard-panel-header-week");
    var leaderboard_header_month=document.getElementById("leaderboard-panel-header-month");
    var leaderboard_header_you=document.getElementById("leaderboard-panel-header-you");
    var leaderboard_content_day=document.getElementById("leaderboard-panel-content-day");
    var leaderboard_content_week=document.getElementById("leaderboard-panel-content-week");
    var leaderboard_content_month=document.getElementById("leaderboard-panel-content-month");
    var leaderboard_content_you=document.getElementById("leaderboard-panel-content-you");
    
    var leaderboard_item_mapping=[];
    
    leaderboard_item_mapping.push({header_el:leaderboard_header_day, content_el:leaderboard_content_day, url:lobby_endpoint+"/highscore-day",ga_eventname:"viewday"});
    leaderboard_item_mapping.push({header_el:leaderboard_header_week, content_el:leaderboard_content_week, url:lobby_endpoint+"/highscore-week",ga_eventname:"viewweek"});
    leaderboard_item_mapping.push({header_el:leaderboard_header_month, content_el:leaderboard_content_month, url:lobby_endpoint+"/highscore-month",ga_eventname:"viewmonth"});
    leaderboard_item_mapping.push({header_el:leaderboard_header_you, content_el:leaderboard_content_you,ga_eventname:"viewyou"});
    
    leaderboard_item_mapping.forEach(function(item){
        item.header_el.addEventListener("click",function(){
            select_leaderboard_header_elem(item);
        });
        item.content_tbody=item.content_el.getElementsByClassName("content-tbody")[0];
        item.refreshing_div=item.content_el.getElementsByClassName("refreshing-div")[0];
    });
    
    var select_leaderboard_header_elem=function(el){
        if(el.suspender){
            el.suspender();
            el.suspender=undefined;
        }
        ga("send","event","leaderboard",el.ga_eventname);
        leaderboard_item_mapping.forEach(function(item){
            if(item===el){
                item.header_el.classList.add("selected");
                item.content_el.classList.remove("displaynone");
            }
            else{
                item.header_el.classList.remove("selected");
                item.content_el.classList.add("displaynone");
            }
        });
        leaderboard_panel_content.scrollTop=0;
        el.refreshing_div.classList.remove("transparent");
        if(el.header_el!==leaderboard_header_you){ // global highscores
            var stop=false;
            el.suspender=function(){
                stop=true;
            };
            var leaderboard_xhr=new XMLHttpRequest();
            leaderboard_xhr.addEventListener("load",function(){
                if(stop)return;
                var new_data=JSON.parse(leaderboard_xhr.responseText);
                var content_tbody=el.content_tbody;
                while(content_tbody.firstChild)content_tbody.removeChild(content_tbody.firstChild);
                var index=1;
                var date_now=Date.now();
                new_data.forEach(function(new_entry){
                    content_tbody.appendChild(createLeaderboardElement(index,new_entry.displayname,new_entry.score,Date.parse(new_entry.time),date_now));
                    ++index;
                });
                el.refreshing_div.classList.add("transparent");
                el.suspender=undefined;
            });
            leaderboard_xhr.open("GET",el.url);
            leaderboard_xhr.send();
        }
        else{ // your games
            // {displayname:string,mass:integer,timestamp:number}
            var new_data=load_max_mass_history();
            new_data.sort(function(a,b){
                return b.mass-a.mass;
            });
            var content_tbody=el.content_tbody;
            while(content_tbody.firstChild)content_tbody.removeChild(content_tbody.firstChild);
            var index=1;
            var date_now=Date.now();
            new_data.forEach(function(new_entry){
                content_tbody.appendChild(createLeaderboardElement(index,new_entry.displayname,new_entry.mass.toString(),new_entry.timestamp,date_now));
                ++index;
            });
            el.refreshing_div.classList.add("transparent");
        }
    };
    
    var getDifferenceTimeString=function(timestamp_ms,now_ms){
        var difference_ms=now_ms-timestamp_ms;
        var one_day=1000*60*60*24;
        var one_hour=1000*60*60;
        var one_minute=1000*60;
        if(difference_ms>=one_day){
            var val=Math.floor(difference_ms/one_day);
            if(val>1)return val.toString()+" days ago";
            else return val.toString()+" day ago";
        }
        if(difference_ms>=one_hour){
            var val=Math.floor(difference_ms/one_hour);
            if(val>1)return val.toString()+" hours ago";
            else return val.toString()+" hour ago";
        }
        if(difference_ms>=one_minute){
            var val=Math.floor(difference_ms/one_minute);
            if(val>1)return val.toString()+" minutes ago";
            else return val.toString()+" minute ago";
        }
        else{
            return "A few seconds ago";
        }
    };
    
    var createLeaderboardElement=function(index_num,displayname_str,highscore_str,timestamp_ms,now_ms){
        var tr=document.createElement("tr");
        var index_td=document.createElement("td");
        index_td.classList.add("index");
        index_td.appendChild(document.createTextNode(index_num.toString()));
        tr.appendChild(index_td);
        var name_td=document.createElement("td");
        name_td.classList.add("name");
        name_td.appendChild(document.createTextNode(displayname_str));
        tr.appendChild(name_td);
        var score_td=document.createElement("td");
        score_td.classList.add("score");
        score_td.appendChild(document.createTextNode(highscore_str));
        tr.appendChild(score_td);
        var timestamp_td=document.createElement("td");
        timestamp_td.classList.add("timestamp");
        timestamp_td.appendChild(document.createTextNode(getDifferenceTimeString(timestamp_ms,now_ms)));
        tr.appendChild(timestamp_td);
        return tr;
    };
    
    
    // leaderboard and join buttons
    var leaderboard_button=document.getElementById("leaderboard-button");
    var leaderboard_button_drawer=new LeaderboardButton(document.getElementById("leaderboard-button-canvas"));
    leaderboard_button.addEventListener("mouseenter",function(){
        leaderboard_button_drawer.startglow();
    });
    leaderboard_button.addEventListener("mouseleave",function(){
        leaderboard_button_drawer.stopglow();
    });
    var join_button=document.getElementById("join-button");
    var join_button_drawer=new JoinButton(document.getElementById("join-button-canvas"));
    join_button.addEventListener("mouseenter",function(){
        join_button_drawer.startglow();
    });
    join_button.addEventListener("mouseleave",function(){
        join_button_drawer.stopglow();
    });
    leaderboard_button.addEventListener("click",function(){
        show_leaderboard_panel();
    });
    join_button.addEventListener("click",function(){
        enter_pressed();
    });
    
    
    
    // interaction mode options
    var interactionmode_el=document.getElementById("interactionmode");
    var interactionlist=[];
    
    Array.prototype.forEach.call(interactionmode_el.childNodes,function(el){
        if(el.nodeType===1&&el.tagName==="SPAN"&&el.classList.contains("interactionoption")){
            interactionlist.push(el);
        }
    });
    interactionmode_el.addEventListener("click",function(e){
        var visibleindex=interactionlist.findIndex(function(el){
            return el.classList.contains("visible");
        });
        interactionlist.forEach(function(el){
            el.classList.remove("visible");
        });
        if(visibleindex!==-1){
            interactionlist[(visibleindex+1)%interactionlist.length].classList.add("visible");
        }
    });
    
    
    // mouse or touch autodetect:
    var suppress_autodetect=false;
    var suppress_autodetector=function(e){
        if(!suppress_autodetect){
            interactionmode_el.removeEventListener("mousedown",suppress_autodetector);
            interactionmode_el.removeEventListener("touchstart",suppress_autodetector);
            window.removeEventListener("mousedown",autodetector);
            window.removeEventListener("touchstart",autodetector);
            suppress_autodetect=true;
        }
    }
    var autodetector=function(e){
        if(!suppress_autodetect){
            if(e.type==="touchstart"){
                interactionlist.forEach(function(el){
                    el.classList.remove("visible");
                });
                document.getElementById("touchdefault").classList.add("visible");
            }
            interactionmode_el.removeEventListener("mousedown",suppress_autodetector);
            interactionmode_el.removeEventListener("touchstart",suppress_autodetector);
            window.removeEventListener("mousedown",autodetector);
            window.removeEventListener("touchstart",autodetector);
            suppress_autodetect=true;
        }
    };
    window.addEventListener("touchstart",autodetector);
    window.addEventListener("mousedown",autodetector);
    interactionmode_el.addEventListener("touchstart",suppress_autodetector);
    interactionmode_el.addEventListener("mousedown",suppress_autodetector);
    
    
    // decide to show ads
    if(window.innerHeight>=document.getElementById("welcome-flex").offsetHeight&&welcome_panel.classList){
        googletag.cmd.push(function(){
            googletag.display('div-gpt-ad-1491910670069-0');
        });
    }
    else{
        document.getElementById("flex-item-ia").classList.add("displaynone");
    }
    
    // detect ad-blocker
    var adblock_detect=document.getElementById("adblock-detect");
    if(!adblock_detect||adblock_detect.offsetHeight===0){
        document.getElementById("ia-please").style.setProperty("display","flex");
    }
    if(adblock_detect)adblock_detect.parentNode.removeChild(adblock_detect);
    adblock_detect=undefined;
    
    
    // hasGlobalCompositeOperationDifference
    var globalCompositeTestCanvas=document.createElement("canvas");
    globalCompositeTestCanvas.width=1;
    globalCompositeTestCanvas.height=1;
    var text_ctx=globalCompositeTestCanvas.getContext("2d");
    text_ctx.fillStyle="white";
    text_ctx.fillRect(0,0,1,1);
    text_ctx.globalCompositeOperation="difference";
    text_ctx.fillRect(0,0,1,1);
    if(text_ctx.getImageData(0,0,1,1).data[0]>128){
        hasGlobalCompositeOperationDifference=false;
    }
    text_ctx=undefined;
    globalCompositeTestCanvas=undefined;
    
    
    // inline help
    var textElements=document.getElementById("flex-item-note").getElementsByTagName("span");
    var nextElementIndex=0;
    var doDisplayNextNote=function(){
        var thisEl=textElements[nextElementIndex];
        thisEl.classList.add("displayed");
        window.setTimeout(function(){
            thisEl.classList.add("opaque");
            window.setTimeout(function(){
                thisEl.classList.remove("opaque");
                window.setTimeout(function(){
                    thisEl.classList.remove("displayed");
                    ++nextElementIndex;
                    if(nextElementIndex>=textElements.length){
                        nextElementIndex-=textElements.length;
                    }
                    window.setTimeout(doDisplayNextNote,0);
                },1000);
            },3980);
        },20);
    };
    window.setTimeout(doDisplayNextNote,0);
    
    
    // newest changes button
    document.getElementById("new-changes-button").addEventListener("click",function(){
        document.getElementById("new-changes-details").classList.toggle("displaynone");
    });
    if(document.getElementById("welcome-panel").offsetWidth>=1000){
        document.getElementById("new-changes-details").classList.remove("displaynone");
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
