// options: {touch:bool, opposite:bool, hasGlobalCompositeOperationDifference:bool}
var DomGame=function(canvas,options,death_callback){
    var canvas_scale=Math.sqrt(canvas.width*canvas.height);
    
    var resize_handler=function(){
        canvas_device_pixel_scale=window.devicePixelRatio||1;
        logical_width=canvas.offsetWidth;
        logical_height=canvas.offsetHeight;
        canvas.width=logical_width*canvas_device_pixel_scale;
        canvas.height=logical_height*canvas_device_pixel_scale;
        canvas_scale=Math.sqrt(logical_width*logical_height);
        send_dimensions_to_server();
        notification_dirty_flag=true;
    };
    var mousemove_handler=function(e){
        process_movement_dir_update(new Point(e.clientX,e.clientY));
    };
    var override_actions=false;
    var mousedown_handler=function(e){
        if(!override_actions){
            if(e.button===0)process_firing_update(new Point(e.clientX,e.clientY),true);
            if(e.button===2)process_boosting_update(true);
        }
    };
    var mouseup_handler=function(e){
        if(!override_actions){
            if(e.button===0)process_firing_update(new Point(e.clientX,e.clientY),false);
            if(e.button===2)process_boosting_update(false);
        }
        else{
            if(death_callback){
                death_callback(max_mass);
                death_callback=undefined;
            }
            setTimeout(function(){
                if(socket)socket.close();
            },1000);
        }
    };
    var mouseout_handler=function(e){
        if(!override_actions){
            process_firing_update(new Point(e.clientX,e.clientY),false);
            process_boosting_update(false);
        }
    };
    
    var touchbuttonradius=48;
    var is_boost_button=function(pt){
        var boost_centre=new Point((options.opposite)?(24+touchbuttonradius):(logical_width-touchbuttonradius-24),logical_height-touchbuttonradius-24);
        return boost_centre.distanceTo(pt)<=touchbuttonradius;
    };
    var is_fire_button=function(pt){
        var fire_centre=new Point((options.opposite)?(logical_width-touchbuttonradius-24):(24+touchbuttonradius),logical_height-touchbuttonradius-24);
        return fire_centre.distanceTo(pt)<=touchbuttonradius;
    };
    
    var lastMovementDirTouchStartTime=0;
    var boostMovementTouchRunning=false;
    var ongoingMovementDirTouchID,ongoingFiringTouchID,ongoingBoostingTouchID;
    var movement_pt=new Point(logical_width/2,logical_height/2);
    
    var touchstart_handler=function(e){
        var movementTouch=Array.prototype.find.call(e.changedTouches,function(touch){
            var pt=new Point(touch.clientX,touch.clientY);
            return (!is_boost_button(pt)&&!is_fire_button(pt));
        });
        if(movementTouch){
            ongoingMovementDirTouchID=movementTouch.identifier;
            movement_pt=new Point(movementTouch.clientX,movementTouch.clientY);
            process_movement_dir_update(movement_pt);
            var nowTime=Date.now();
            if(lastMovementDirTouchStartTime+300>nowTime){
                process_boosting_update(true);
                boostMovementTouchRunning=true;
            }
            lastMovementDirTouchStartTime=nowTime;
        }
        var boostingTouch=Array.prototype.find.call(e.changedTouches,function(touch){
            var pt=new Point(touch.clientX,touch.clientY);
            return is_boost_button(pt);
        });
        if(boostingTouch){
            ongoingBoostingTouchID=boostingTouch.identifier;
            process_boosting_update(true);
        }
        var firingTouch=Array.prototype.find.call(e.changedTouches,function(touch){
            var pt=new Point(touch.clientX,touch.clientY);
            return is_fire_button(pt);
        });
        if(firingTouch){
            ongoingFiringTouchID=firingTouch.identifier;
            process_firing_update(movement_pt,true);
        }
        //e.preventDefault();
    };
    var touchend_handler=function(e){
        if(ongoingMovementDirTouchID!==undefined){
            var movementTouch=Array.prototype.find.call(e.changedTouches,function(touch){
                return touch.identifier===ongoingMovementDirTouchID;
            });
            if(movementTouch){
                ongoingMovementDirTouchID=undefined;
                if(boostMovementTouchRunning){
                    if(ongoingBoostingTouchID===undefined)process_boosting_update(false);
                    boostMovementTouchRunning=false;
                }
            }
        }
        if(ongoingBoostingTouchID!==undefined){
            var boostingTouch=Array.prototype.find.call(e.changedTouches,function(touch){
                return touch.identifier===ongoingBoostingTouchID;
            });
            if(boostingTouch){
                ongoingBoostingTouchID=undefined;
                if(!boostMovementTouchRunning)process_boosting_update(false);
            }
        }
        if(ongoingFiringTouchID!==undefined){
            var firingTouch=Array.prototype.find.call(e.changedTouches,function(touch){
                return touch.identifier===ongoingFiringTouchID;
            });
            if(firingTouch){
                ongoingFiringTouchID=undefined;
                process_firing_update(movement_pt,false);
            }
        }
        //e.preventDefault();
    };
    var touchcancel_handler=function(e){
        touchend_handler(e); // react as if it is a touchend.
        //e.preventDefault();
    };
    var touchmove_handler=function(e){
        if(ongoingMovementDirTouchID!==undefined){
            var movementTouch=Array.prototype.find.call(e.changedTouches,function(touch){
                return touch.identifier===ongoingMovementDirTouchID;
            });
            if(movementTouch){
                movement_pt=new Point(movementTouch.clientX,movementTouch.clientY);
                process_movement_dir_update(movement_pt);
            }
        }
        //e.preventDefault();
    };
    var keydown_handler=function(e){
        if(!override_actions){
            switch(e.key){
                case " ":
                case "Spacebar":
                    process_boosting_update(true);
                    break;
            }
        }
    };
    var keyup_handler=function(e){
        if(!override_actions){
            switch(e.key){
                case " ":
                case "Spacebar": // some older browsers return "Spacebar" instead of " ".
                    process_boosting_update(false);
                    break;
            }
        }
    };
    
    var unload_handler=function(){
        if(is_alive&&death_callback){
            death_callback(max_mass);
            death_callback=undefined;
        }
    };
    
    
    var client_area=new ChangeLimitedDelayEngine(function(prev_area,target_area,time_diff){
        if(prev_area===target_area)return target_area;
        /*var multiplier=1.0000001;
        if(prev_area<target_area){
            curr_area=prev_area*Math.pow(multiplier,time_diff);
            return((curr_area>=target_area)?target_area:curr_area);
        }
        else{
            curr_area=prev_area*Math.pow(multiplier,-time_diff);
            return((curr_area<=target_area)?target_area:curr_area);
        }*/
        if(time_diff<0)console.log("invalid!");
        var multiplier=1.00001;
        if(prev_area<target_area){
            curr_area=Math.pow(Math.sqrt(prev_area)*Math.pow(multiplier,time_diff),2);
            return((curr_area>=target_area)?target_area:curr_area);
        }
        else{
            curr_area=Math.pow(Math.sqrt(prev_area)*Math.pow(multiplier,-time_diff),2);
            return((curr_area<=target_area)?target_area:curr_area);
        }
    },function(area){
        return area;
    });
    var height,width; // in relative coords, such that height*width=1;
    var agents=new InterpolatorMap(function(weightedAverager,cloner){
        return new InterpolationDelayEngine(weightedAverager,cloner);
    },function(agent1,weight1,agent2,weight2){
        if(Math.abs(weight1+weight2)<0.1){
            return new Agent(agent1.location,agent1.mass,agent1.health,agent1.is_boosting,agent1.has_shield);
        }
        var location=Point.weightedAverage(agent1.location,weight1,agent2.location,weight2);
        var mass=(weight2>0)?((agent1.mass*weight1+agent2.mass*weight2)/(weight1+weight2)):agent1.mass;
        var health=(weight2>0)?((agent1.health*weight1+agent2.health*weight2)/(weight1+weight2)):agent1.health;
        var is_boosting=agent1.is_boosting;
        var has_shield=agent1.has_shield;
        return new Agent(location,mass,health,is_boosting,has_shield);
    },function(agent){
        return new Agent(agent.location,agent.mass,agent.health,agent.is_boosting,agent.has_shield);
    });

    var agent_properties=new Map(); // contains name and other static details
    var foods=new InterpolatorMap(function(weightedAverager,cloner){
        return new InterpolationDelayEngine(weightedAverager,cloner);
    },function(food1,weight1,food2,weight2){
        if(Math.abs(weight1+weight2)<0.1){
            return new Food(food1.location,food1.is_projectile);
        }
        var location=Point.weightedAverage(food1.location,weight1,food2.location,weight2);
        var is_projectile=food1.is_projectile&&food2.is_projectile;
        return new Food(location,is_projectile);
    },function(food){
        return new Food(food.location,food.is_projectile);
    });
    var current_agent_boost_streams=new Map(); //each element is (updated_time,array of offset,array of point,width) describing the movement at that point.  It is updated upon game tick.  Hopefully it doesnt get too slow.  Deletion is done in the process_message handler.
    var agent_boost_streams=[]; // each element is (updated_time,array of offset,array of point,width). Shares elements with current_agent_boost_streams.  Deletion is done in the drawing handler.
    
    var agent_shields=new Map(); // each element is (fade_start_time(optional=undefined)).  Addition and updating fade_start_time is done in the process_message handler, Deletion is done in the drawing handler.
    
    var agent_spawn_animations=new Map(); // each element is {lights:[{starttimeoffset (since spawn time), horizontal_angle (at spawntime), vertical_angle, inclination_horizontal_angle, inclination_vertical_angle, speed (in radians per millisecond)}]}
    
    var food_update_cache=new Map(); // storage of foods that server expects client to have.
    
    var food_properties=new Map(); // contains static details: foodid:{spawntime(in displayTime units):timestamp}. each food in foods should have its associated properties.

    var leaderboard=[]; // each element is {display_name,score}
    
    var max_mass=0; // maximum mass of player in this game
    
    var firstupdate=true;


    var centre_loc=new InterpolationDelayEngine(function(loc1,weight1,loc2,weight2){
        if(Math.abs(weight1+weight2)<0.1){
            return new Point(loc1.x,loc1.y);
        }
        return Point.weightedAverage(loc1,weight1,loc2,weight2);
    },function(loc){
        return new Point(loc.x,loc.y);;
    });
    
    var leader_agentid=undefined; // undefined = no leader or not shown
    var leader_direction=undefined;
    var make_new_leader_direction_engine=function(){
        return new InterpolationDelayEngine(function(dir1,weight1,dir2,weight2){
            /*if(dir1===undefined){
                return undefined;
            }
            if(dir2===undefined){
                return dir1;
            }*/
            if(Math.abs(weight1+weight2)<0.1){
                return dir1;
            }
            if(Math.abs(dir1-(dir2-2*Math.PI))<1){
                dir2-=2*Math.PI;
            }
            else if(Math.abs(dir1-(dir2+2*Math.PI))<1){
                dir2+=2*Math.PI;
            }
            if(Math.abs(dir1-dir2)<1){
                var x=(dir1*weight1+dir2*weight2)/(weight1+weight2);
                if(x<-Math.PI)x+=2*Math.PI;
                else if(x>=Math.PI)x-=2*Math.PI;
                return x;
            }
            return dir1; // too far away - it is a wraparound (discontinuity)
        },function(dir){
            return dir;
        });
    };
    
    var notification_manager=new GameNotificationService(1000);
    var notification_dirty_flag=false;
    
    var is_alive=false;
    
    var my_agentid=undefined;
    //var current_mouse_pos=new Point(0,0);
    var current_movement_dir=null;
    var current_firing=false;
    var current_boosting=false;
    var message_period=100; // 100 ms per update from server
    var displayTime=undefined; // last rendered time
    var socket;
    var canvas;
    var food_radius=100;
    var boost_animation_period=1000;
    
    var canvas_device_pixel_scale=1;
    var logical_width,logical_height;
    
    var anim_request=undefined;
    
    this._start=function(remote_endpoint,display_name){
        window.addEventListener("resize",resize_handler);
        resize_handler();
        if(!options.touch){
            canvas.addEventListener("mousemove",mousemove_handler);
            canvas.addEventListener("mousedown",mousedown_handler);
            canvas.addEventListener("mouseup",mouseup_handler);
            canvas.addEventListener("mouseout",mouseout_handler);
            window.addEventListener("keydown",keydown_handler);
            window.addEventListener("keyup",keyup_handler);
        }
        else{
            canvas.addEventListener("touchmove",touchmove_handler);
            canvas.addEventListener("touchstart",touchstart_handler);
            canvas.addEventListener("touchend",touchend_handler);
            canvas.addEventListener("touchcancel",touchcancel_handler);
        }
        // disable context menu // TODO: should this be in this.stop also?
        canvas.addEventListener("contextmenu",function(e){
            e.preventDefault();
            return false;
        });
        // save game if leaving
        window.addEventListener("unload",unload_handler);
        
        var ctx=canvas.getContext("2d",{alpha:false});
        var draw_handler=function(){
            ctx.save();
            var real_height=logical_height;
            var real_width=logical_width;
            canvas_scale=Math.sqrt(real_height*real_width);
            ctx.scale(canvas_scale*canvas_device_pixel_scale,canvas_scale*canvas_device_pixel_scale);
            height=real_height/canvas_scale;
            width=real_width/canvas_scale;
            draw(ctx);
            ctx.restore();
            anim_request=window.requestAnimationFrame(draw_handler);
        };
        try{
            socket=new WebSocket("ws://"+remote_endpoint);
            socket.binaryType="arraybuffer";
            socket.addEventListener("open",function(){
                spawn_me_on_server(display_name);
                send_dimensions_to_server();
                anim_request=window.requestAnimationFrame(draw_handler);
            });
            socket.addEventListener("error",function(e){
                console.log(e.message);
            });
            socket.addEventListener("message",function(e){
                process_message(e.data);
                // lag test:
                /*setTimeout(function(){
                    process_message(e.data);
                },150+Math.random()*100);*/
            });
            socket.addEventListener("close",function(e){
                console.log("Connection terminated. (Code: "+e.code+", reason: "+e.reason+")");
            });
            ctx.mozImageSmoothingEnabled=false;
            ctx.webkitImageSmoothingEnabled=false;
            ctx.msImageSmoothingEnabled=false;
            ctx.imageSmoothingEnabled=false;
            ctx.fillStyle="black";
            ctx.fillRect(0,0,width,height);
        }
        catch(e){
            console.log(e.message);
        }
    };
    this._stop=function(){
        if(socket)socket.close();
        socket=undefined;
        window.cancelAnimationFrame(anim_request);
        window.removeEventListener("unload",unload_handler);
        if(!options.touch){
            window.removeEventListener("keyup",keyup_handler);
            window.removeEventListener("keydown",keydown_handler);
            canvas.removeEventListener("mouseout",mouseout_handler);
            canvas.removeEventListener("mouseup",mouseup_handler);
            canvas.removeEventListener("mousedown",mousedown_handler);
        }
        else{
            canvas.removeEventListener("touchcancel",touchcancel_handler);
            canvas.removeEventListener("touchend",touchend_handler);
            canvas.removeEventListener("touchstart",touchstart_handler);
            canvas.removeEventListener("touchmove",touchmove_handler);
        }
        window.removeEventListener("resize",resize_handler);
    }

    var getFittingText=function(ctx,text,maxWidth){
        var width=ctx.measureText(text).width;
        if(width<=maxWidth)return text;
        var ellipsis="…";
        var best=ellipsis;
        for(var i=1;i<text.length;++i){
            var str=text.substr(0,i)+ellipsis;
            if(ctx.measureText(str).width<=maxWidth){
                best=str;
            }
            else{
                break;
            }
        }
        return best;
    };
    
    var prerendered_boost_button_canvas;
    var prerendered_fire_button_canvas;

    var draw=function(ctx){
        var have_server_data_to_draw=!!(centre_loc.currTime); // don't draw anything if no data has been received from server yet.
        displayTime=Date.now()-message_period;
        if(!have_server_data_to_draw)return;
        //ctx.clearRect(0,0,width,height);
        ctx.fillStyle="black";
        ctx.fillRect(0,0,width,height);
        ctx.save();
        var _curr_area=client_area.get(displayTime);
        if(!_curr_area)_curr_area=300000*Math.sqrt(100000); // this is the starting screen area
        var server_size_factor=Math.sqrt(_curr_area);
        var current_centre=centre_loc.get(displayTime);
        if(current_centre)ctx.translate(width/2-current_centre.x/server_size_factor,height/2-current_centre.y/server_size_factor);
        //if(my_agentid)ctx.translate(width/2-agents.get(my_agentid,displayTime).location.x/server_size_factor,height/2-agents.get(my_agentid,displayTime).location.y/server_size_factor);
        //if(my_agentid)console.log(agents.get(my_agentid,displayTime).location.x+" "+agents.get(my_agentid,displayTime).location.y);
        ctx.scale(1/server_size_factor,1/server_size_factor);
        //var current_transform=ctx.currentTransform;
        //var left=-current_transform.e/current_transform.a;
        //var top=-current_transform.f/current_transform.d;
        var left=(current_centre)?(current_centre.x-width/2*server_size_factor):0;
        var top=(current_centre)?(current_centre.y-height/2*server_size_factor):0;
        var right=left+width*server_size_factor;
        var bottom=top+height*server_size_factor;
        ctx.lineCap="butt";
        ctx.lineWidth=2*server_size_factor/canvas_scale;
        ctx.strokeStyle="#333";
        for(var x=Math.ceil(left/1000)*1000;x<=left+width*server_size_factor;x+=1000){
            ctx.beginPath();
            ctx.moveTo(x,top);
            ctx.lineTo(x,top+height*server_size_factor);
            ctx.stroke();
        }
        for(var y=Math.ceil(top/1000)*1000;y<=top+height*server_size_factor;y+=1000){
            ctx.beginPath();
            ctx.moveTo(left,y);
            ctx.lineTo(left+width*server_size_factor,y);
            ctx.stroke();
        }
        /*ctx.fillStyle="lightcyan";
        ctx.shadowColor=ctx.fillStyle;
        ctx.shadowBlur=100;
        ctx.shadowOffsetX=0;
        ctx.shadowOffsetY=0;*/
        // boost animations are drawn before foods and agents, so that boost will be below them.
        
        agent_boost_streams=agent_boost_streams.filter(function(agent_boost_stream){
            // TODO: possible off-by-one errors!
            var endlength=Math.ceil((2000-(displayTime-agent_boost_stream.updated_time))/100);
            if(endlength<=0){
                return false;
            }
            if(endlength<agent_boost_stream.data.length)agent_boost_stream.data=agent_boost_stream.data.slice(0,endlength);
            if(agent_boost_stream.data.length<=1)return true;
            agent_boost_stream.offset.forEach(function(offset){
                var offset_boost_stream=agent_boost_stream.data.map(function(pt,index,arr){
                    var ang_next,ang_prev;
                    if(index>0){
                        ang_prev=pt.angleFrom(arr[index-1]);
                    }
                    if(index<arr.length-1){
                        ang_next=pt.angleTo(arr[index+1]);
                    }
                    var ang_avg;
                    if(index===0){
                        ang_avg=ang_next;
                    }
                    else if(index===arr.length-1){
                        ang_avg=ang_prev;
                    }
                    else{
                        ang_avg=wraparound_average(ang_prev,ang_next,Math.PI*2);
                        // note: ang_avg can be any value from -Math.PI*2 to Math.PI*2 due to the way wraparound_average works.
                    }
                    ang_avg+=Math.PI/2; // rotates by 90 deg
                    return pt.translateByDirection(ang_avg,(1-Math.pow(Math.min((displayTime-agent_boost_stream.updated_time+(index+1)*100)/2000,1),4))*agent_boost_stream.width*Math.sin(offset+(agent_boost_stream.updated_time-index*100)/boost_animation_period*2*Math.PI));
                });
                offset_boost_stream.forEach(function(pt,index,arr){
                    if(displayTime-agent_boost_stream.updated_time+index*100>=0&&index>0&&index<arr.length-1){
                        ctx.lineCap="butt";
                        ctx.lineWidth=20;
                        var ax=(arr[index-1].x+pt.x)/2;
                        var ay=(arr[index-1].y+pt.y)/2;
                        var bx=(arr[index+1].x+pt.x)/2;
                        var by=(arr[index+1].y+pt.y)/2;
                        var linearGradient=ctx.createLinearGradient(ax,ay,bx,by);
                        linearGradient.addColorStop(0,"rgba(255,255,255,"+(0.5-0.5*(displayTime-agent_boost_stream.updated_time+index*100)/2000)+")");
                        linearGradient.addColorStop(1,"rgba(255,255,255,"+Math.max(0.5-0.5*(displayTime-agent_boost_stream.updated_time+(index+1)*100)/2000,0)+")");
                        //ctx.strokeStyle="rgba(255,255,255,"+(1-(displayTime-agent_boost_stream.updated_time+index*100)/2000)+")";
                        ctx.strokeStyle=linearGradient;
                        ctx.beginPath();
                        ctx.moveTo(ax,ay);
                        ctx.quadraticCurveTo(pt.x,pt.y,bx,by);
                        ctx.stroke();
                    }
                });
            });

            /*for(var i=1;i<agent_boost_stream.data.length-1;++i){
                if(displayTime-agent_boost_stream.updated_time+i*100>=0){
                    ctx.lineCap="butt";
                    ctx.lineWidth=30;
                    ctx.strokeStyle="rgba(255,255,255,"+(1-(displayTime-agent_boost_stream.updated_time+i*100)/2000)+")";
                    var ax=(agent_boost_stream.data[i-1].x+agent_boost_stream.data[i].x)/2;
                    var ay=(agent_boost_stream.data[i-1].y+agent_boost_stream.data[i].y)/2;
                    var bx=(agent_boost_stream.data[i+1].x+agent_boost_stream.data[i].x)/2;
                    var by=(agent_boost_stream.data[i+1].y+agent_boost_stream.data[i].y)/2;
                    ctx.beginPath();
                    ctx.moveTo(ax,ay);
                    ctx.quadraticCurveTo(agent_boost_stream.data[i].x,agent_boost_stream.data[i].y,bx,by);
                    ctx.stroke();
                }
            }*/
            return true;
        });

        // foods are drawn before agents, so that agents appear on top.
        foods.forEach(function(food,foodid){
            // check if its a newly spawned food that needs an animation.
            var food_outer_radius=food_radius*11/8;
            var food_property=food_properties.get(foodid);
            if(!food_property)console.log("Food property is missing!  Your computer might explode!");
            if(food_property.spawntime!==undefined&&(food.location.x+food_outer_radius<=left||food.location.x-food_outer_radius>=right||food.location.y+food_outer_radius<=top||food.location.y-food_outer_radius>=bottom)){
                food_property.spawntime=undefined;
            }
            var food_growth=1; // fraction of food size
            if(food_property.spawntime!==undefined){
                food_growth=Math.min((displayTime-food_property.spawntime)/300,1);
                if(food_growth===1)food_property.spawntime=undefined;
            }
            
            var food_gradient=ctx.createRadialGradient(food.location.x,food.location.y,/*food_radius*4/8*/0,food.location.x,food.location.y,food_radius*11/8);
            if(!food.is_projectile){
                if(food_growth-1+4/11+7/11*0>0){
                    food_gradient.addColorStop(0,"rgba(255,255,128,1)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*0,"rgba(255,255,128,1)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1/3,"rgba(255,255,128,0.7)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*2/3,"rgba(255,255,128,0.3)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1,"rgba(255,255,128,0)");
                }
                else if(food_growth-1+4/11+7/11*1/3>0){
                    food_gradient.addColorStop(0,"rgba(255,255,128,"+(0.7+0.3/(1/3)*(food_growth-1+4/11+7/11*1/3))+")");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1/3,"rgba(255,255,128,0.7)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*2/3,"rgba(255,255,128,0.3)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1,"rgba(255,255,128,0)");
                }
                else if(food_growth-1+4/11+7/11*2/3>0){
                    food_gradient.addColorStop(0,"rgba(255,255,128,"+(0.3+0.4/(1/3)*(food_growth-1+4/11+7/11*2/3))+")");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*2/3,"rgba(255,255,128,0.3)");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1,"rgba(255,255,128,0)");
                }
                else{
                    food_gradient.addColorStop(0,"rgba(255,255,128,"+(0+0.3/(1/3)*(food_growth-1+4/11+7/11*1))+")");
                    food_gradient.addColorStop(food_growth-1+4/11+7/11*1,"rgba(255,255,128,0)");
                }
            }
            else{
                food_gradient.addColorStop(4/11+7/11*0,"rgba(255,170,128,1)");
                food_gradient.addColorStop(4/11+7/11*1/3,"rgba(255,170,128,0.7)");
                food_gradient.addColorStop(4/11+7/11*2/3,"rgba(255,170,128,0.3)");
                food_gradient.addColorStop(4/11+7/11*1,"rgba(255,170,128,0)");
            }
            ctx.fillStyle=food_gradient;
            ctx.beginPath();
            ctx.arc(food.location.x,food.location.y,food_radius*11/8,-Math.PI,Math.PI);
            ctx.closePath();
            ctx.fill();
        },displayTime);
        /*projectiles.forEach(function(projectile){
            var projectile_gradient=ctx.createRadialGradient(projectile.location.x,projectile.location.y,food_radius*4/8,projectile.location.x,projectile.location.y,food_radius*11/8);
            projectile_gradient.addColorStop(0,"rgba(255,170,128,1)");
            projectile_gradient.addColorStop(0.33,"rgba(255,170,128,0.7)");
            projectile_gradient.addColorStop(0.67,"rgba(255,170,128,0.3)");
            projectile_gradient.addColorStop(1,"rgba(255,170,128,0)");
            ctx.fillStyle=projectile_gradient;
            ctx.beginPath();
            ctx.arc(projectile.location.x,projectile.location.y,food_radius*11/8,-Math.PI,Math.PI);
            ctx.closePath();
            ctx.fill();
        },displayTime);*/
        
        
        // spawn transporter effects
        // brief outline of animation:
        // 0-1600 ms: spawn lights (80 of them, 1 every 20 ms)
        // 0-1600 ms: lineWidth from 0.01 to 0.06
        // 1500-2500 ms: fade in agent
        // 2000-4000 ms: lineWidth from 0.06 to 0.01
        // 2400-4000 ms: despawn lights
        var delayed_transporter_effects=[]; //{translate_x,translate_y,scale,painters:[]}
        ctx.save();
        ctx.lineCap="butt";
        
        agents.forEach(function(agent,agentid){
            
            
            // spawn animation:
            var agent_spawn_time=agent_properties.get(agentid).spawntime;
            if(agent_spawn_time!==undefined){
                var spawn_animation=agent_spawn_animations.get(agentid);
                // {lights:[{starttimeoffset, horizontal_angle (at spawntime), vertical_angle, inclination_horizontal_angle, inclination_vertical_angle, speed (in radians per millisecond)}]}
                if(spawn_animation===undefined){
                    spawn_animation={lights:[]};
                    agent_spawn_animations.set(agentid,spawn_animation);
                }
                
                var time_since_spawn=displayTime-agent_spawn_time;
                
                if(time_since_spawn>=4000){
                    agent_spawn_animations.delete(agentid);
                    agent_properties.get(agentid).spawntime=undefined;
                    return;
                }
                
                var transporter_effect={translate_x:agent.location.x, translate_y:agent.location.y, scale:Math.sqrt(agent.mass)*3/2, painters:[]};
                delayed_transporter_effects.push(transporter_effect);

                ctx.save();
                ctx.lineWidth=Math.max(Math.min(Math.min(time_since_spawn,4000-time_since_spawn),1600),0)/1600*0.09+0.01;
                ctx.translate(transporter_effect.translate_x,transporter_effect.translate_y);
                ctx.scale(transporter_effect.scale,transporter_effect.scale);
                // now (0,0) is the centre of agent, and the lights width and height are 1
                
                // add lights if we are deficient:
                var proper_light_count=Math.max(Math.min(Math.ceil(Math.min(time_since_spawn,4000-time_since_spawn)/25),80),0);
                while(spawn_animation.lights.length<proper_light_count){ // 10 ms per light
                    var starttimeoffset=10*spawn_animation.lights.length;
                    var horizontal_angle=Math.random()*2*Math.PI;
                    var vertical_angle=Math.asin(Math.sqrt(Math.random())*Math.sin(Math.random()*2*Math.PI));
                    var inclination_horizontal_angle=Math.random()*2*Math.PI;
                    var inclination_vertical_angle=Math.pow(Math.random()*2-1,3)*Math.PI/4;
                    var speed=Math.PI/300; // 300 ms for half a round
                    var newlight={starttimeoffset:starttimeoffset, horizontal_angle:horizontal_angle, vertical_angle:vertical_angle, inclination_horizontal_angle:inclination_horizontal_angle, inclination_vertical_angle:inclination_vertical_angle, speed:speed};
                    spawn_animation.lights.push(newlight);
                }
                while(spawn_animation.lights.length>proper_light_count){
                    spawn_animation.lights.pop();
                }
                
                // draw lights that are behind the agent:
                spawn_animation.lights.forEach(function(light){
                    // we shall draw the whole light behind for now.
                    // each light is a transformed circle with the center 1/2 rows removed
                    var pointstore=[];
                    for(var i=0;i<8;++i){
                        var curr_horizontal_angle=light.horizontal_angle+light.speed*(time_since_spawn-i*20)
                        var curr_x=Math.cos(curr_horizontal_angle)*Math.cos(light.vertical_angle);
                        var curr_y=Math.sin(light.vertical_angle)+Math.sin(curr_horizontal_angle-light.inclination_horizontal_angle)*Math.sin(light.inclination_vertical_angle)*Math.cos(light.vertical_angle);
                        pointstore.push({x:curr_x,y:curr_y,ha:curr_horizontal_angle});
                    }
                    var pointlinestore=[];
                    for(var i=1;i+1<pointstore.length;++i){
                        var prev_x=pointstore[i-1].x;
                        var prev_y=pointstore[i-1].y;
                        var next_x=pointstore[i+1].x;
                        var next_y=pointstore[i+1].y;
                        var a=next_y-prev_y;
                        var b=prev_x-next_x;
                        var c=next_x*prev_y-prev_x*next_y;
                        pointlinestore.push({x:pointstore[i].x,y:pointstore[i].y,ha:pointstore[i].ha,a:a,b:b,c:c});
                    }
                    for(var i=1;i<pointlinestore.length;++i){
                        //if(!(Math.sin(pointlinestore[i-1].ha)<0&&Math.sin(pointlinestore[i].ha)<0))continue; // don't draw if in front of agent.
                        
                        var a1=pointlinestore[i-1].a;
                        var b1=pointlinestore[i-1].b;
                        var c1=pointlinestore[i-1].c;
                        var a2=pointlinestore[i].a;
                        var b2=pointlinestore[i].b;
                        var c2=pointlinestore[i].c;
                        
                        
                        var lightGradient=ctx.createLinearGradient(pointlinestore[i-1].x,pointlinestore[i-1].y,pointlinestore[i].x,pointlinestore[i].y);
                        lightGradient.addColorStop(0,"rgba(255,255,255,"+(1-(i-1)/(pointlinestore.length-1))+")");
                        lightGradient.addColorStop(1,"rgba(255,255,255,"+(1-(i)/(pointlinestore.length-1))+")");
                        
                        var painter_fn=undefined;
                        
                        var denom=a2*b1-a1*b2;
                        if(Math.abs(denom)>0.000001){
                            var cpx=(c1*b2-c2*b1)/denom;
                            var cpy=(c2*a1-c1*a2)/denom;
                            
                            painter_fn=(function(lightGradient,x1,y1,cpx,cpy,x2,y2){
                                return function(ctx){
                                    ctx.strokeStyle=lightGradient;
                                    ctx.beginPath();
                                    ctx.moveTo(x1,y1);
                                    ctx.quadraticCurveTo(cpx,cpy,x2,y2);
                                    ctx.stroke();
                                }
                            })(lightGradient,pointlinestore[i-1].x,pointlinestore[i-1].y,cpx,cpy,pointlinestore[i].x,pointlinestore[i].y);
                        }
                        else{
                            painter_fn=(function(lightGradient,x1,y1,x2,y2){
                                return function(ctx){
                                    ctx.strokeStyle=lightGradient;
                                    ctx.beginPath();
                                    ctx.moveTo(x1,y1);
                                    ctx.lineTo(x2,y2);
                                    ctx.stroke();
                                }
                            })(lightGradient,pointlinestore[i-1].x,pointlinestore[i-1].y,pointlinestore[i].x,pointlinestore[i].y);
                        }
                        
                        if(Math.sin(pointlinestore[i-1].ha)<0&&Math.sin(pointlinestore[i].ha)<0)painter_fn(ctx);
                        else transporter_effect.painters.push(painter_fn);
                    }
                });
                ctx.restore();
            }
        },displayTime);
        ctx.restore();
        
        
        
        agents.forEach(function(agent,agentid){
            var agent_spawn_time=agent_properties.get(agentid).spawntime;
            var opacity=1;
            if(agent_spawn_time!==undefined){
                var time_since_spawn=displayTime-agent_spawn_time;
                if(time_since_spawn<=1500)return; // don't draw;
                if(time_since_spawn<2500)opacity=(time_since_spawn-1500)/1000;
            }
            var outer_radius=Math.sqrt(agent.mass)+agent.health*12;
            var player_gradient=ctx.createRadialGradient(agent.location.x,agent.location.y,Math.sqrt(agent.mass),agent.location.x,agent.location.y,outer_radius);
            player_gradient.addColorStop(0,"rgba(224,255,255,"+(opacity*1)+")");
            player_gradient.addColorStop(0.33,"rgba(224,255,255,"+(opacity*0.7)+")");
            player_gradient.addColorStop(0.67,"rgba(224,255,255,"+(opacity*0.3)+")");
            player_gradient.addColorStop(1,"rgba(224,255,255,0)");
            ctx.fillStyle=player_gradient;
            ctx.beginPath();
            ctx.arc(agent.location.x,agent.location.y,outer_radius,-Math.PI,Math.PI);
            ctx.closePath();
            ctx.fill();
        },displayTime);
        
        
        
        ctx.save();
        ctx.lineCap="butt";
        ctx.lineWidth=0.03;
        delayed_transporter_effects.forEach(function(transporter_effect){
            ctx.save();
            ctx.translate(transporter_effect.translate_x,transporter_effect.translate_y);
            ctx.scale(transporter_effect.scale,transporter_effect.scale);
            transporter_effect.painters.forEach(function(painter){
                painter(ctx);
            });
            ctx.restore();
        });
        ctx.restore();
        delayed_transporter_effects=[]; // release the memory
        
        // spawn transporter effects
        /*agents.forEach(function(agent,agentid){
            ctx.save();
            ctx.translate(agent.location.x,agent.location.y);
            ctx.scale(Math.sqrt(agent.mass)*3/2,Math.sqrt(agent.mass)*3/2);
            // now (0,0) is the centre of agent, and the lights width and height are 1
            
            // spawn animation:
            var agent_spawn_time=agent_properties.get(agentid).spawntime;
            if(agent_spawn_time!==undefined){
                var spawn_animation=agent_spawn_animations.get(agentid);
                // {lights:[{starttimeoffset, horizontal_angle (at spawntime), vertical_angle, inclination_horizontal_angle, inclination_vertical_angle, speed (in radians per millisecond)}]}
                
                
                var time_since_spawn=displayTime-agent_spawn_time;
                
                
                
                // draw lights that are behind the agent:
                spawn_animation.lights.forEach(function(light){
                    // we shall draw the whole light behind for now.
                    // each light is a transformed circle with the center 1/2 rows removed
                    ctx.save();
                    var pointstore=[];
                    for(var i=0;i<8;++i){
                        var curr_horizontal_angle=light.horizontal_angle+light.speed*(time_since_spawn-i*20)
                        var curr_x=Math.cos(curr_horizontal_angle)*Math.cos(light.vertical_angle);
                        var curr_y=Math.sin(light.vertical_angle)+Math.sin(curr_horizontal_angle-light.inclination_horizontal_angle)*Math.sin(light.inclination_vertical_angle)*Math.cos(light.vertical_angle);
                        pointstore.push({x:curr_x,y:curr_y,ha:curr_horizontal_angle});
                    }
                    var pointlinestore=[];
                    for(var i=1;i+1<pointstore.length;++i){
                        var prev_x=pointstore[i-1].x;
                        var prev_y=pointstore[i-1].y;
                        var next_x=pointstore[i+1].x;
                        var next_y=pointstore[i+1].y;
                        var a=next_y-prev_y;
                        var b=prev_x-next_x;
                        var c=next_x*prev_y-prev_x*next_y;
                        pointlinestore.push({x:pointstore[i].x,y:pointstore[i].y,ha:pointstore[i].ha,a:a,b:b,c:c});
                    }
                    for(var i=1;i<pointlinestore.length;++i){
                        if(Math.sin(pointlinestore[i-1].ha)<0&&Math.sin(pointlinestore[i].ha)<0)continue; // don't draw if behind agent.
                        
                        var a1=pointlinestore[i-1].a;
                        var b1=pointlinestore[i-1].b;
                        var c1=pointlinestore[i-1].c;
                        var a2=pointlinestore[i].a;
                        var b2=pointlinestore[i].b;
                        var c2=pointlinestore[i].c;
                        
                        ctx.lineCap="butt";
                        ctx.lineWidth=0.03;
                        var lightGradient=ctx.createLinearGradient(pointlinestore[i-1].x,pointlinestore[i-1].y,pointlinestore[i].x,pointlinestore[i].y);
                        lightGradient.addColorStop(0,"rgba(255,255,255,"+(1-(i-1)/(pointlinestore.length-1))+")");
                        lightGradient.addColorStop(1,"rgba(255,255,255,"+(1-(i)/(pointlinestore.length-1))+")");
                        ctx.strokeStyle=lightGradient;
                        ctx.beginPath();
                        ctx.moveTo(pointlinestore[i-1].x,pointlinestore[i-1].y);
                        
                        var denom=a2*b1-a1*b2;
                        if(Math.abs(denom)>0.000001){
                            var cpx=(c1*b2-c2*b1)/denom;
                            var cpy=(c2*a1-c1*a2)/denom;
                            
                            ctx.quadraticCurveTo(cpx,cpy,pointlinestore[i].x,pointlinestore[i].y);
                        }
                        else{
                            ctx.lineTo(pointlinestore[i].x,pointlinestore[i].y);
                        }
                        
                        ctx.stroke();
                    }
                    
                    
                    
                    ctx.restore();
                });
            }
            ctx.restore();
        },displayTime);*/
        
        

        ctx.save();
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        if(hasGlobalCompositeOperationDifference){
            ctx.globalCompositeOperation="difference";
            ctx.fillStyle="white";
        }
        else{
            ctx.fillStyle="grey";
        }
        agents.forEach(function(agent,agentid){
            var font_size=Math.pow(agent.mass,1/4)*8; // fractional font sizes display different indifferent browsers, but we are not really concerned about that.
            ctx.font=font_size+"px CandelaBold,sans-serif";//"1000px Baloo"
            var display_name=agent_properties.get(agentid).display_name;
            ctx.fillText(display_name,agent.location.x,agent.location.y);
        },displayTime);
        ctx.restore();
        
        // shields
        ctx.save(); // SEEMS UNNECCESSARY
        agent_shields.forEach(function(agent_shield,agentid){
            var agent=agents.get(agentid,displayTime);
            if(agent){
                var agent_radius=Math.sqrt(agent.mass);
                var shield_radius=agent_radius+Math.sqrt(agent.mass);
                if(agent_shield.fade_start_time){
                    if(displayTime>agent_shield.fade_start_time){
                        if(displayTime>=agent_shield.fade_start_time+1000){
                            agent_shields.delete(agentid);
                            return;
                        }
                        else{
                            ctx.globalAlpha=(agent_shield.fade_start_time+1000-displayTime)/1000;
                        }
                    }
                    else{
                        ctx.globalAlpha=1;
                    }
                }
                else{
                    ctx.globalAlpha=1;
                }
                var shield_gradient=ctx.createRadialGradient(agent.location.x,agent.location.y,shield_radius-200,agent.location.x,agent.location.y,shield_radius+20);
                shield_gradient.addColorStop(0/11,"rgba(255,255,255,0)");
                shield_gradient.addColorStop(4/11,"rgba(255,255,255,0.1)");
                shield_gradient.addColorStop(7/11,"rgba(255,255,255,0.25)");
                shield_gradient.addColorStop(10/11,"rgba(255,255,255,0.5)");
                shield_gradient.addColorStop(11/11,"rgba(255,255,255,0)");
                ctx.fillStyle=shield_gradient;
                ctx.beginPath();
                ctx.arc(agent.location.x,agent.location.y,shield_radius+15,-Math.PI,Math.PI);
                ctx.closePath();
                ctx.fill();
            }
            else{
                agent_shields.delete(agentid);
            }
        });
        ctx.restore(); // SEEMS UNNECCESSARY
        
        
        ctx.restore(); // revert from server coordinates to area=1 coordinates
        
        
        // direction to leader
        if(leader_agentid&&leader_direction){
            var leader_agent=agents.get(leader_agentid,displayTime);
            if(!leader_agent||!in_area(centre_loc.get(displayTime),new Point(width/2*server_size_factor,height/2*server_size_factor),leader_agent.location)){
                ctx.save();

                var scale_coefficient=1/(32*Math.sqrt(canvas_scale));
                var curr_leader_direction=leader_direction.get(displayTime);
                var margin=24*scale_coefficient;
                var screen_basic_angle=Math.atan2(height-2*margin,width-2*margin);

                var translate_x, translate_y;
                if(curr_leader_direction>=-screen_basic_angle&&curr_leader_direction<=screen_basic_angle){
                    // right end of screen
                    translate_x=width-margin;
                    translate_y=height/2+(width/2-margin)*Math.tan(curr_leader_direction);
                }
                else if(curr_leader_direction>0&&curr_leader_direction<=Math.PI-screen_basic_angle){
                    // bottom end of screen
                    translate_y=height-margin;
                    translate_x=width/2+(height/2-margin)/Math.tan(curr_leader_direction);
                }
                else if(curr_leader_direction<0&&curr_leader_direction>=-Math.PI+screen_basic_angle){
                    // top end of screen
                    translate_y=margin;
                    translate_x=width/2-(height/2-margin)/Math.tan(curr_leader_direction);
                }
                else{
                    // left end of screen
                    translate_x=margin;
                    translate_y=height/2-(width/2-margin)*Math.tan(curr_leader_direction);
                }

                ctx.translate(translate_x,translate_y);
                ctx.scale(scale_coefficient,scale_coefficient);
                ctx.rotate(curr_leader_direction)
                var leaderdirection_gradient=ctx.createLinearGradient(17,0,-27,0);
                leaderdirection_gradient.addColorStop(0,"rgba(0,255,0,1)");
                leaderdirection_gradient.addColorStop(1,"rgba(0,255,0,0)");
                ctx.strokeStyle=leaderdirection_gradient;
                ctx.lineJoin="miter";
                ctx.lineWidth=12;
                ctx.beginPath();
                ctx.moveTo(-22,30);
                ctx.lineTo(0,0);
                ctx.lineTo(-22,-30);
                ctx.stroke();

                ctx.restore();
            }
        }

        // draw leaderboard to screen (with screen normalised coordinates (width, height))
        ctx.save();
        ctx.translate(width,0);
        ctx.scale(1/(32*Math.sqrt(canvas_scale)),1/(32*Math.sqrt(canvas_scale)));
        ctx.translate(-8,8);
        ctx.font="14px CandelaBold,sans-serif";
        if(hasGlobalCompositeOperationDifference){
            ctx.globalCompositeOperation="difference";
            ctx.fillStyle="white";
        }
        else{
            ctx.fillStyle="grey";
        }
        ctx.textBaseline="top";
        for(var i=0;i<leaderboard.length;++i){
            var score_width=ctx.measureText(leaderboard[i].score.toString()).width;
            ctx.textAlign="left";
            var calculatedName=getFittingText(ctx,leaderboard[i].display_name,192-score_width-4);
            ctx.fillText(calculatedName,-192,i*20);
            ctx.textAlign="right";
            ctx.fillText(leaderboard[i].score.toString(),0,i*20);
        }
        ctx.restore();
        
        // draw notifications to screen
        ctx.save();
        ctx.translate(width/2,0);
        ctx.scale(1/(canvas_scale*canvas_device_pixel_scale),1/(canvas_scale*canvas_device_pixel_scale));
        ctx.font="18px CandelaBold,sans-serif";
        // after this line, it is screen real pixels scale
        var logical_scale=Math.sqrt(canvas_scale)/32;
        var textheight=40;
        var textoffset=40;
        var horizontal_padding=8;
        var gradient_dist=6;
        
        var realtextoffset=textoffset*logical_scale*canvas_device_pixel_scale;
        var realtextheight=textheight*logical_scale*canvas_device_pixel_scale;
        
        notification_manager.forEachNotification(displayTime,function(message,time_from_start,time_from_end,key){
            if(notification_dirty_flag||!message.prepared_canvas){
                message.prepared_canvas=document.createElement("canvas");
                var prepared_width=Math.ceil((ctx.measureText(message.text).width+2*horizontal_padding)*logical_scale*canvas_device_pixel_scale);
                message.prepared_canvas.width=prepared_width;
                var prepared_height=Math.ceil(textheight*logical_scale*canvas_device_pixel_scale);
                message.prepared_canvas.height=prepared_height;
                var prepared_ctx=message.prepared_canvas.getContext("2d");
                var gradient_dist_real=Math.floor(gradient_dist*logical_scale*canvas_device_pixel_scale);
                
                var backgroundfillStyle="rgba(0,0,0,0.5)";
                var transparent="rgba(0,0,0,0.0)";
                
                prepared_ctx.fillStyle=backgroundfillStyle;
                prepared_ctx.fillRect(gradient_dist_real,gradient_dist_real,prepared_width-2*gradient_dist_real,prepared_height-2*gradient_dist_real);
                
                // top
                var gradient=prepared_ctx.createLinearGradient(0,gradient_dist_real,0,0);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(gradient_dist_real,0,prepared_width-2*gradient_dist_real,gradient_dist_real);
                // bottom
                var gradient=prepared_ctx.createLinearGradient(0,prepared_height-gradient_dist_real,0,prepared_height);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(gradient_dist_real,prepared_height-gradient_dist_real,prepared_width-2*gradient_dist_real,gradient_dist_real);
                // left
                var gradient=prepared_ctx.createLinearGradient(gradient_dist_real,0,0,0);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(0,gradient_dist_real,gradient_dist_real,prepared_height-2*gradient_dist_real);
                // right
                var gradient=prepared_ctx.createLinearGradient(prepared_width-gradient_dist_real,0,prepared_width,0);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(prepared_width-gradient_dist_real,gradient_dist_real,gradient_dist_real,prepared_height-2*gradient_dist_real);
                // top-left
                var gradient=prepared_ctx.createRadialGradient(gradient_dist_real,gradient_dist_real,0,gradient_dist_real,gradient_dist_real,gradient_dist_real);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(0,0,gradient_dist_real,gradient_dist_real);
                // top-right
                var gradient=prepared_ctx.createRadialGradient(prepared_width-gradient_dist_real,gradient_dist_real,0,prepared_width-gradient_dist_real,gradient_dist_real,gradient_dist_real);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(prepared_width-gradient_dist_real,0,gradient_dist_real,gradient_dist_real);
                // bottom-right
                var gradient=prepared_ctx.createRadialGradient(prepared_width-gradient_dist_real,prepared_height-gradient_dist_real,0,prepared_width-gradient_dist_real,prepared_height-gradient_dist_real,gradient_dist_real);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(prepared_width-gradient_dist_real,prepared_height-gradient_dist_real,gradient_dist_real,gradient_dist_real);
                // bottom-left
                var gradient=prepared_ctx.createRadialGradient(gradient_dist_real,prepared_height-gradient_dist_real,0,gradient_dist_real,prepared_height-gradient_dist_real,gradient_dist_real);
                gradient.addColorStop(0,backgroundfillStyle);
                gradient.addColorStop(1,transparent);
                prepared_ctx.fillStyle=gradient;
                prepared_ctx.fillRect(0,prepared_height-gradient_dist_real,gradient_dist_real,gradient_dist_real);
                
                prepared_ctx.save();
                prepared_ctx.translate(prepared_width/2,prepared_height/2);
                prepared_ctx.scale(logical_scale*canvas_device_pixel_scale,logical_scale*canvas_device_pixel_scale);
                prepared_ctx.fillStyle=message.color;
                prepared_ctx.font="18px CandelaBold,sans-serif";
                prepared_ctx.textAlign="center";
                prepared_ctx.textBaseline="middle";
                prepared_ctx.fillText(message.text,0,0);
                
                prepared_ctx.restore();
            }
            
            
            if(time_from_start<500){ // appearing
                var tmp_canvas=document.createElement("canvas");
                tmp_canvas.width=message.prepared_canvas.width;
                tmp_canvas.height=message.prepared_canvas.height;
                var tmp_ctx=tmp_canvas.getContext("2d");
                var transit_width=20*logical_scale*canvas_device_pixel_scale;
                var tmp_gradient=tmp_ctx.createLinearGradient(-transit_width,0,tmp_canvas.width+transit_width,0);
                var transit_end=time_from_start/500*(tmp_canvas.width+transit_width);
                var transit_start=transit_end-transit_width;
                tmp_gradient.addColorStop(Math.min(1,Math.max(0,transit_start/(tmp_canvas.width+transit_width))),"rgba(0,0,0,1)")
                tmp_gradient.addColorStop(Math.min(1,Math.max(0,transit_end/(tmp_canvas.width+transit_width))),"rgba(0,0,0,0)")
                tmp_ctx.fillStyle=tmp_gradient;
                tmp_ctx.fillRect(0,0,tmp_canvas.width,tmp_canvas.height);
                tmp_ctx.globalCompositeOperation="source-in";
                tmp_ctx.drawImage(message.prepared_canvas,0,0);
                ctx.drawImage(tmp_canvas,-message.prepared_canvas.width/2,realtextoffset-message.prepared_canvas.height/2);
                realtextoffset+=realtextheight;
                tmp_ctx=undefined;
                tmp_canvas=undefined; // not necessary, but explicitly undefine canvas so browser will (hopefully) free memory faster
            }
            else if(time_from_end<=0){ // static
                ctx.drawImage(message.prepared_canvas,-message.prepared_canvas.width/2,realtextoffset-message.prepared_canvas.height/2);
                realtextoffset+=realtextheight;
            }
            else{ // disappearing
                ctx.save();
                ctx.globalAlpha=Math.max(0,1-time_from_end/800);
                ctx.drawImage(message.prepared_canvas,-message.prepared_canvas.width/2,realtextoffset-message.prepared_canvas.height/2);
                ctx.restore();
                realtextoffset+=realtextheight*Math.min(1,Math.max(0,(1-(time_from_end-500)/500)));
            }
            
            
        });
        
        notification_dirty_flag=false;
        
        
        
        
        
        ctx.restore();
        
        if(options.touch){
            // draw touch buttons with logical screen coordinates - 96 * 96 px per button
            ctx.save();
            ctx.scale(1/canvas_scale,1/canvas_scale);

            // boost button
            ctx.save();
            if(!options.opposite){
                ctx.translate(logical_width-96-24-12,logical_height-96-24-12);
            }
            else{
                ctx.translate(12,logical_height-96-24-12);
            }
            if(!prerendered_boost_button_canvas){
                prerendered_boost_button_canvas=document.createElement("canvas");
                prerendered_boost_button_canvas.width=(96+24)*canvas_device_pixel_scale;
                prerendered_boost_button_canvas.height=(96+24)*canvas_device_pixel_scale;
                var prerender_ctx=prerendered_boost_button_canvas.getContext("2d");
                prerender_ctx.scale(canvas_device_pixel_scale,canvas_device_pixel_scale);
                prerender_ctx.translate(48+12,48+12);

                // black background
                var button_background_gradient=prerender_ctx.createRadialGradient(0,0,48,0,0,48+12);
                button_background_gradient.addColorStop(0,"rgba(0,0,0,0.5)");
                button_background_gradient.addColorStop(1,"rgba(0,0,0,0)");
                prerender_ctx.fillStyle=button_background_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,48+12,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();

                var boost_angle=-30*Math.PI/180;

                // button border
                var button_border_gradient=prerender_ctx.createRadialGradient(0,0,36,0,0,48);
                button_border_gradient.addColorStop(0,"rgba(255,255,255,0)");
                button_border_gradient.addColorStop(0.4,"rgba(255,255,255,0.1)");
                button_border_gradient.addColorStop(0.7,"rgba(255,255,255,0.25)");
                button_border_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.fillStyle=button_border_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,48,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();


                prerender_ctx.translate(24*Math.cos(boost_angle),24*Math.sin(boost_angle));

                // button boost streams
                var button_boost_locpoints=[];
                for(var index=0;index<=16;++index){
                    var translate_dist=index*4;
                    var pt_x=-Math.cos(boost_angle)*translate_dist;
                    var pt_y=-Math.sin(boost_angle)*translate_dist;
                    button_boost_locpoints.push(new Point(pt_x,pt_y));
                }
                var button_boost_keypoints=[];
                var button_num_boost_streams=3;
                var boost_offset_angle=boost_angle+Math.PI/2;
                for(var i=0;i<button_num_boost_streams;++i){
                    var this_boost_keypoints=[];
                    button_boost_locpoints.forEach(function(pt,index){
                        var disp=(1-Math.pow(index/16,4))*12*Math.sin(index+Math.PI*2/button_num_boost_streams*i);
                        var pt_x=pt.x+Math.cos(boost_offset_angle)*disp;
                        var pt_y=pt.y+Math.sin(boost_offset_angle)*disp;
                        this_boost_keypoints.push(new Point(pt_x,pt_y));
                    });
                    button_boost_keypoints.push(this_boost_keypoints);
                }
                button_boost_keypoints.forEach(function(keystream){
                    keystream.forEach(function(pt,index,arr){
                        if(index>=1 && index<arr.length-1){
                            prerender_ctx.lineCap="butt";
                            prerender_ctx.lineWidth=2;
                            var ax=(arr[index-1].x+pt.x)/2;
                            var ay=(arr[index-1].y+pt.y)/2;
                            var bx=(arr[index+1].x+pt.x)/2;
                            var by=(arr[index+1].y+pt.y)/2;
                            var boost_linearGradient=prerender_ctx.createLinearGradient(ax,ay,bx,by);
                            boost_linearGradient.addColorStop(0,"rgba(255,255,255,"+((1-(index-0.5)/16)/2)+")");
                            boost_linearGradient.addColorStop(1,"rgba(255,255,255,"+((1-(index+0.5)/16)/2)+")");
                            prerender_ctx.strokeStyle=boost_linearGradient;
                            prerender_ctx.beginPath();
                            prerender_ctx.moveTo(ax,ay);
                            prerender_ctx.quadraticCurveTo(pt.x,pt.y,bx,by);
                            prerender_ctx.stroke();
                        }
                    });
                });

                // button agent
                var button_agent_hole_gradient=prerender_ctx.createRadialGradient(0,0,12,0,0,18);
                button_agent_hole_gradient.addColorStop(0,"rgba(255,255,255,1)");
                button_agent_hole_gradient.addColorStop(0.33,"rgba(255,255,255,0.7)");
                button_agent_hole_gradient.addColorStop(0.67,"rgba(255,255,255,0.3)");
                button_agent_hole_gradient.addColorStop(1,"rgba(255,255,255,0)");
                prerender_ctx.fillStyle=button_agent_hole_gradient;
                prerender_ctx.globalCompositeOperation="destination-out";
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,18,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();
                var button_agent_gradient=prerender_ctx.createRadialGradient(0,0,12,0,0,18);
                button_agent_gradient.addColorStop(0,"rgba(255,255,255,0.5)");
                button_agent_gradient.addColorStop(0.33,"rgba(255,255,255,0.35)");
                button_agent_gradient.addColorStop(0.67,"rgba(255,255,255,0.15)");
                button_agent_gradient.addColorStop(1,"rgba(255,255,255,0)");
                prerender_ctx.fillStyle=button_agent_gradient;
                prerender_ctx.globalCompositeOperation="source-over";
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,18,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();
            }
            ctx.drawImage(prerendered_boost_button_canvas,0,0,96+24,96+24);
            ctx.restore();

            // fire button
            ctx.save();
            if(!options.opposite){
                //ctx.translate(12,logical_height-96*2-24*2-12);
                ctx.translate(12,logical_height-96-24-12);
            }
            else{
                //ctx.translate(logical_width-96-24-12,logical_height-96*2-24*2-12);
                ctx.translate(logical_width-96-24-12,logical_height-96-24-12);
            }
            if(!prerendered_fire_button_canvas){
                prerendered_fire_button_canvas=document.createElement("canvas");
                prerendered_fire_button_canvas.width=(96+24)*canvas_device_pixel_scale;
                prerendered_fire_button_canvas.height=(96+24)*canvas_device_pixel_scale;
                var prerender_ctx=prerendered_fire_button_canvas.getContext("2d");
                prerender_ctx.scale(canvas_device_pixel_scale,canvas_device_pixel_scale);
                prerender_ctx.translate(48+12,48+12);

                // black background
                var button_background_gradient=prerender_ctx.createRadialGradient(0,0,48,0,0,48+12);
                button_background_gradient.addColorStop(0,"rgba(0,0,0,0.5)");
                button_background_gradient.addColorStop(1,"rgba(0,0,0,0)");
                prerender_ctx.fillStyle=button_background_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,48+12,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();

                var boost_angle=-30*Math.PI/180;

                // button border
                var button_border_gradient=prerender_ctx.createRadialGradient(0,0,36,0,0,48);
                button_border_gradient.addColorStop(0,"rgba(255,255,255,0)");
                button_border_gradient.addColorStop(0.4,"rgba(255,255,255,0.1)");
                button_border_gradient.addColorStop(0.7,"rgba(255,255,255,0.25)");
                button_border_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.fillStyle=button_border_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,48,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();


                prerender_ctx.translate(-24*Math.cos(boost_angle),-24*Math.sin(boost_angle));

                // button agent
                var button_agent_gradient=prerender_ctx.createRadialGradient(0,0,12,0,0,18);
                button_agent_gradient.addColorStop(0,"rgba(255,255,255,0.5)");
                button_agent_gradient.addColorStop(0.33,"rgba(255,255,255,0.35)");
                button_agent_gradient.addColorStop(0.67,"rgba(255,255,255,0.15)");
                button_agent_gradient.addColorStop(1,"rgba(255,255,255,0)");
                prerender_ctx.fillStyle=button_agent_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(0,0,18,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();

                // button projectile
                prerender_ctx.rotate(boost_angle);

                var button_projectile_gradient=prerender_ctx.createRadialGradient(48,0,6,48,0,9);
                button_projectile_gradient.addColorStop(0,"rgba(255,255,255,0.5)");
                button_projectile_gradient.addColorStop(0.33,"rgba(255,255,255,0.35)");
                button_projectile_gradient.addColorStop(0.67,"rgba(255,255,255,0.15)");
                button_projectile_gradient.addColorStop(1,"rgba(255,255,255,0)");
                prerender_ctx.fillStyle=button_projectile_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.arc(48,0,9,-Math.PI,Math.PI);
                prerender_ctx.closePath();
                prerender_ctx.fill();

                // lines
                prerender_ctx.lineWidth=2;
                prerender_ctx.lineCap="round";
                var stroke_gradient;
                stroke_gradient=prerender_ctx.createLinearGradient(20,0,37,0);
                stroke_gradient.addColorStop(0,"rgba(255,255,255,0.2)");
                stroke_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.strokeStyle=stroke_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.moveTo(20,0);
                prerender_ctx.lineTo(37,0);
                prerender_ctx.stroke();
                stroke_gradient=prerender_ctx.createLinearGradient(28,4.5,38.5,4.5);
                stroke_gradient.addColorStop(0,"rgba(255,255,255,0.2)");
                stroke_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.strokeStyle=stroke_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.moveTo(28,4.5);
                prerender_ctx.lineTo(38.5,4.5);
                prerender_ctx.stroke();
                stroke_gradient=prerender_ctx.createLinearGradient(28,-4.5,38.5,-4.5);
                stroke_gradient.addColorStop(0,"rgba(255,255,255,0.2)");
                stroke_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.strokeStyle=stroke_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.moveTo(28,-4.5);
                prerender_ctx.lineTo(38.5,-4.5);
                prerender_ctx.stroke();
                stroke_gradient=prerender_ctx.createLinearGradient(12,1,24,8);
                stroke_gradient.addColorStop(0,"rgba(255,255,255,0)");
                stroke_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.strokeStyle=stroke_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.moveTo(12,1);
                prerender_ctx.lineTo(24,8);
                prerender_ctx.stroke();
                stroke_gradient=prerender_ctx.createLinearGradient(12,-1,24,-8);
                stroke_gradient.addColorStop(0,"rgba(255,255,255,0)");
                stroke_gradient.addColorStop(1,"rgba(255,255,255,0.5)");
                prerender_ctx.strokeStyle=stroke_gradient;
                prerender_ctx.beginPath();
                prerender_ctx.moveTo(12,-1);
                prerender_ctx.lineTo(24,-8);
                prerender_ctx.stroke();
            }
            ctx.drawImage(prerendered_fire_button_canvas,0,0,96+24,96+24);
            ctx.restore();
            
            ctx.restore();
        }
    };
    var message_time_storage=[];
    var last_message_curr_location=undefined;
    var boardsize=new Point(80000,80000);
    //var last_message_time=undefined;
    var process_message=function(data){
        //var this_messsage_time=new Date().getTime();
        //if(last_message_time)console.log(this_messsage_time-last_message_time);
        //last_message_time=this_messsage_time;
        try{
            //var stream=new TokenStream(data.split(" "));
            var stream=new ByteReadStream(data);

            var msgtype=stream.readUint8();
            switch(msgtype){
                case 1:
                    process_field_update(stream);
                    break;
                case 2:
                    process_death(stream);
                    break;
                case 3:
                    process_leaderboard_update(stream);
                    break;
                case 4:
                    process_leader_killed(stream);
                    break;
                case 5:
                    process_leader_changed(stream);
                    break;
            }


        }
        catch(e){
            console.log(e);
        }
    };

    var process_field_update=function(stream){
        var new_agents=new Map();
        //var new_projectiles=new Map();
        var new_foods=new Map();

        var timestamp=stream.readUint64();
        
        
        
        var clienttime=Date.now();
        message_time_storage.push(clienttime-timestamp);
        if(message_time_storage.length>50)message_time_storage.shift();
        var avg_delay=message_time_storage.reduce(function(sum,el){
            return sum+el;
        },0)/message_time_storage.length;
        var calculatedtime=timestamp+avg_delay;
        
        var screen_centre=Point.fromStream(stream);
        var screen_dimensions=Point.fromStream(stream);
        
        my_agentid=stream.readUint64()+"";
        if(my_agentid!=="0"){ // 0 is a special 'null' value.
            is_alive=true;
        }
        else{
            my_agentid=undefined;
        }
        /*if(screen_centre.x<0||screen_centre.x>=boardsize.x||screen_centre.y<0||screen_centre.y>=boardsize.y){
            console.log("Invalid! "+screen_centre.x+" "+screen_centre.y);
        }
        console.log(screen_centre.x+" "+screen_centre.y);*/
        
        
        var agent_ct=stream.readUint32();
        var updated_foods_ct=stream.readUint32();
        var removed_foods_ct=stream.readUint32();
        for(var i=0;i<agent_ct;++i){
            var agentid=stream.readUint64()+"";
            //if(i===0)my_agentid=agentid;
            var new_agent=Agent.fromStream(stream);
            //if(i===0)console.log(new_agent.location.x+" "+new_agent.location.y);
            
            // update my max size
            if(agentid===my_agentid){
                max_mass=Math.max(max_mass,new_agent.mass);
            }
            
            new_agents.set(agentid,new_agent);
            if(!agent_properties.has(agentid)){
                var new_agent_properties=AgentProperties.fromStream(stream);
                if(new_agent.has_shield){
                    new_agent_properties.spawntime=displayTime-stream.readUint8()*message_period;
                }
                agent_properties.set(agentid,new_agent_properties);
            }
        }
        for(var i=0;i<updated_foods_ct;++i){
            var foodid=stream.readUint64()+"";
            var new_food=Food.fromStream(stream);
            new_foods.set(foodid,new_food);
            food_update_cache.delete(foodid);
            if(!food_properties.has(foodid)){
                food_properties.set(foodid,{spawntime:(firstupdate?undefined:displayTime)});
                //food_properties.set(foodid,{spawntime:displayTime});
            }
            //if(new_food.location.x-screen_centre.x>boardsize.x)console.log("Yes!");
        }
        for(var i=0;i<removed_foods_ct;++i){
            var foodid=stream.readUint64()+"";
            food_update_cache.delete(foodid);
            food_properties.delete(foodid);
            //if(new_food.location.x-screen_centre.x>boardsize.x)console.log("Yes!");
        }
        food_update_cache.forEach(function(new_food,foodid){
            new_foods.set(foodid,new_food);
        });
        food_update_cache.clear();
        new_foods.forEach(function(new_food,foodid){
            food_update_cache.set(foodid,new Food(new_food.location,new_food.is_projectile));
        });
        
        
        // leader_direction
        var new_leader_agentid=stream.readUint64()+"";
        if(new_leader_agentid!==leader_agentid){
            leader_direction=undefined;
            leader_agentid=new_leader_agentid;
            if(leader_agentid==="0")leader_agentid=undefined;
        }
        if(leader_agentid!==undefined&&leader_agentid!==my_agentid){
            var new_leader_direction=stream.readInt16()*((2*Math.PI)/(360*60));
            if(!leader_direction)leader_direction=make_new_leader_direction_engine();
            leader_direction.set(new_leader_direction,calculatedtime);
        }
        else{
            leader_direction=undefined;
        }
        
        
        
        
        var curr_message_curr_location=screen_centre;
        if(last_message_curr_location&&last_message_curr_location.x-curr_message_curr_location.x>boardsize.x/2){
            [agents,foods].forEach(function(interpolatorMap){
                interpolatorMap.forEachEngine(function(engine){
                    if(engine.lastRetrievedLocation)engine.lastRetrievedLocation.location=new Point(engine.lastRetrievedLocation.location.x-boardsize.x,engine.lastRetrievedLocation.location.y);
                    if(engine.currLocation)engine.currLocation.location=new Point(engine.currLocation.location.x-boardsize.x,engine.currLocation.location.y);
                    if(engine.prevLocation)engine.prevLocation.location=new Point(engine.prevLocation.location.x-boardsize.x,engine.prevLocation.location.y);
                });
            });
            agent_boost_streams.forEach(function(agent_boost_stream){
                agent_boost_stream.data.forEach(function(pt){ // no need to clone pt as it is guaranteed that nobody else holds a reference to this object
                    pt.x-=boardsize.x;
                });
            });
            if(centre_loc.lastRetrievedLocation)centre_loc.lastRetrievedLocation=new Point(centre_loc.lastRetrievedLocation.x-boardsize.x,centre_loc.lastRetrievedLocation.y);
            if(centre_loc.currLocation)centre_loc.currLocation=new Point(centre_loc.currLocation.x-boardsize.x,centre_loc.currLocation.y);
            if(centre_loc.prevLocation)centre_loc.prevLocation=new Point(centre_loc.prevLocation.x-boardsize.x,centre_loc.prevLocation.y);
        }
        else if(last_message_curr_location&&curr_message_curr_location.x-last_message_curr_location.x>boardsize.x/2){
            [agents,foods].forEach(function(interpolatorMap){
                interpolatorMap.forEachEngine(function(engine){
                    if(engine.lastRetrievedLocation)engine.lastRetrievedLocation.location=new Point(engine.lastRetrievedLocation.location.x+boardsize.x,engine.lastRetrievedLocation.location.y);
                    if(engine.currLocation)engine.currLocation.location=new Point(engine.currLocation.location.x+boardsize.x,engine.currLocation.location.y);
                    if(engine.prevLocation)engine.prevLocation.location=new Point(engine.prevLocation.location.x+boardsize.x,engine.prevLocation.location.y);
                });
            });
            agent_boost_streams.forEach(function(agent_boost_stream){
                agent_boost_stream.data.forEach(function(pt){ // no need to clone pt as it is guaranteed that nobody else holds a reference to this object
                    pt.x+=boardsize.x;
                });
            });
            if(centre_loc.lastRetrievedLocation)centre_loc.lastRetrievedLocation=new Point(centre_loc.lastRetrievedLocation.x+boardsize.x,centre_loc.lastRetrievedLocation.y);
            if(centre_loc.currLocation)centre_loc.currLocation=new Point(centre_loc.currLocation.x+boardsize.x,centre_loc.currLocation.y);
            if(centre_loc.prevLocation)centre_loc.prevLocation=new Point(centre_loc.prevLocation.x+boardsize.x,centre_loc.prevLocation.y);
        }
        if(last_message_curr_location&&last_message_curr_location.y-curr_message_curr_location.y>boardsize.y/2){
            [agents,foods].forEach(function(interpolatorMap){
                interpolatorMap.forEachEngine(function(engine){
                    if(engine.lastRetrievedLocation)engine.lastRetrievedLocation.location=new Point(engine.lastRetrievedLocation.location.x,engine.lastRetrievedLocation.location.y-boardsize.y);
                    if(engine.currLocation)engine.currLocation.location=new Point(engine.currLocation.location.x,engine.currLocation.location.y-boardsize.y);
                    if(engine.prevLocation)engine.prevLocation.location=new Point(engine.prevLocation.location.x,engine.prevLocation.location.y-boardsize.y);
                });
            });
            agent_boost_streams.forEach(function(agent_boost_stream){
                agent_boost_stream.data.forEach(function(pt){ // no need to clone pt as it is guaranteed that nobody else holds a reference to this object
                    pt.y-=boardsize.y;
                });
            });
            if(centre_loc.lastRetrievedLocation)centre_loc.lastRetrievedLocation=new Point(centre_loc.lastRetrievedLocation.x,centre_loc.lastRetrievedLocation.y-boardsize.y);
            if(centre_loc.currLocation)centre_loc.currLocation=new Point(centre_loc.currLocation.x,centre_loc.currLocation.y-boardsize.y);
            if(centre_loc.prevLocation)centre_loc.prevLocation=new Point(centre_loc.prevLocation.x,centre_loc.prevLocation.y-boardsize.y);
        }
        else if(last_message_curr_location&&curr_message_curr_location.y-last_message_curr_location.y>boardsize.y/2){
            [agents,foods].forEach(function(interpolatorMap){
                interpolatorMap.forEachEngine(function(engine){
                    if(engine.lastRetrievedLocation)engine.lastRetrievedLocation.location=new Point(engine.lastRetrievedLocation.location.x,engine.lastRetrievedLocation.location.y+boardsize.y);
                    if(engine.currLocation)engine.currLocation.location=new Point(engine.currLocation.location.x,engine.currLocation.location.y+boardsize.y);
                    if(engine.prevLocation)engine.prevLocation.location=new Point(engine.prevLocation.location.x,engine.prevLocation.location.y+boardsize.y);
                });
            });
            agent_boost_streams.forEach(function(agent_boost_stream){
                agent_boost_stream.data.forEach(function(pt){ // no need to clone pt as it is guaranteed that nobody else holds a reference to this object
                    pt.y+=boardsize.y;
                });
            });
            if(centre_loc.lastRetrievedLocation)centre_loc.lastRetrievedLocation=new Point(centre_loc.lastRetrievedLocation.x,centre_loc.lastRetrievedLocation.y+boardsize.y);
            if(centre_loc.currLocation)centre_loc.currLocation=new Point(centre_loc.currLocation.x,centre_loc.currLocation.y+boardsize.y);
            if(centre_loc.prevLocation)centre_loc.prevLocation=new Point(centre_loc.prevLocation.x,centre_loc.prevLocation.y+boardsize.y);
        }

        // boost stream animations:
        var new_current_agent_boost_streams=new Map();
        new_agents.forEach(function(agent,agentid){
            // for boost animation:
            if(agent.is_boosting){
                var agent_boost_stream=current_agent_boost_streams.get(agentid);
                if(!agent_boost_stream){
                    agent_boost_stream={updated_time:calculatedtime,offset:[],data:[],width:Math.sqrt(agent.mass)/1.5};
                    for(var j=0;j<Math.sqrt(agent.mass)/150;++j){
                        agent_boost_stream.offset.push(Math.random()*2*Math.PI);
                    }
                    agent_boost_streams.push(agent_boost_stream);
                }
                agent_boost_stream.updated_time=calculatedtime;
                agent_boost_stream.offset=agent_boost_stream.offset.map(function(offset){
                    return (offset+(boost_animation_period/message_period*2*Math.PI))%(2*Math.PI);
                });
                agent_boost_stream.data.unshift(new Point(agent.location));
                new_current_agent_boost_streams.set(agentid,agent_boost_stream);
            }
        });
        current_agent_boost_streams=new_current_agent_boost_streams;
        
        // shields
        new_agents.forEach(function(agent,agentid){
            // for boost animation:
            if(agent.has_shield){
                agent_shields.set(agentid,{fade_start_time:undefined});
            }
            else{
                var agent_shield=agent_shields.get(agentid);
                if(agent_shield&&!agent_shield.fade_start_time){
                    agent_shield.fade_start_time=calculatedtime;
                }
            }
        });
        




        last_message_curr_location=curr_message_curr_location;
        // end modulo
        agents.setData(new_agents,calculatedtime);
        // TODO: smooth spawn speed for projectiles

        foods.setData(new_foods,calculatedtime);
        
        // centre location
        centre_loc.set(screen_centre,calculatedtime);

        // client view size variability
        //client_area.set(300000*Math.sqrt(my_agent_mass));
        client_area.set(screen_dimensions.x*screen_dimensions.y);
        
        
        firstupdate=false;
        
    };

    var process_death=function(stream){
        is_alive=false;
        my_agentid=undefined;
        override_actions=true;
        
        setTimeout(function(){
            if(death_callback){
                death_callback(max_mass);
                death_callback=undefined;
            }
            setTimeout(function(){
                if(socket)socket.close();
            },1000);
        },4000);
    };

    var process_leaderboard_update=function(stream){
        var leaderboard_ct=stream.readUint8();
        leaderboard=[];
        for(var i=0;i<leaderboard_ct;++i){
            var curr_display_name=stream.readString();
            var curr_score=stream.readInt64();
            leaderboard.push({display_name:curr_display_name,score:curr_score});
        }
    };
    
    var process_leader_killed=function(stream){
        var killer_id=stream.readUint64()+"";
        var killer_display_name=stream.readString();
        if(killer_id===my_agentid){
            notification_manager.add({text:"You have killed the leader!",color:"rgba(160,255,160,0.8)"},undefined,6000);
        }
        else{
            notification_manager.add({text:killer_display_name+" has killed the leader!",color:"rgba(160,255,160,0.8)"},undefined,6000);
        }
    };
    
    var process_leader_changed=function(stream){
        var leader_id=stream.readUint64()+"";
        var leader_display_name=stream.readString();
        notification_manager.remove("current_leader");
        if(leader_id===my_agentid){
            notification_manager.add({text:"You are now the leader",color:"rgba(255,255,255,0.8)"},"current_leader",6000);
        }
        else{
            notification_manager.add({text:leader_display_name+" is now the leader",color:"rgba(255,255,255,0.8)"},"current_leader",6000);
        }
    };
    
    
    



    var spawn_me_on_server=function(display_name){
        // the first '3' in the message denotes 'spawn me'
        // sends display name to server too
        if(socket.readyState===1){
            var stream=new ByteWriteStream();
            stream.writeUint8(3);
            stream.writeString(display_name);
            socket.send(stream.getBuffer());
        }
    };

    var send_dimensions_to_server=function(){
        // the first '2' in the message denotes 'screen dimensions update'
        //if(socket.readyState===1)socket.send("2 "+Math.round(canvas.width/canvas_scale*server_size_factor).toString()+" "+Math.round(canvas.height/canvas_scale*server_size_factor).toString());
        if(socket&&socket.readyState===1){
            var stream=new ByteWriteStream();
            stream.writeUint8(2);
            stream.writeUint32(logical_width);
            stream.writeUint32(logical_height);
            socket.send(stream.getBuffer());
            //socket.send("2 "+canvas.width.toString()+" "+canvas.height.toString());
        }
    };

    var send_update_to_server=function(){
        if(socket.readyState===1&&is_alive){ // OPEN state
           // var server_mouse_pos=new Point((pt.x-canvas.width/2)/canvas_scale*server_size_factor,(pt.y-canvas.height/2)/canvas_scale*server_size_factor);
            // the first '1' in the message denotes 'action'
            var stream=new ByteWriteStream();
            stream.writeUint8(1);
            stream.writeBool(current_movement_dir!==null);
            stream.writeBool(current_firing);
            if(current_movement_dir!==null){
                stream.writeBool(current_boosting);
                stream.writeInt16(Math.round(current_movement_dir*((360*60)/(2*Math.PI))));
            }
            socket.send(stream.getBuffer());
        }
    };

    var process_movement_dir_update=function(pt){
        if(is_alive&&displayTime){
            var current_mouse_pos=pt;
            var centerpoint=new Point(logical_width/2,logical_height/2);
            if(current_mouse_pos.distanceFrom(centerpoint)<Math.sqrt(agents.get(my_agentid,displayTime).mass)/Math.sqrt(client_area.get(displayTime))*canvas_scale){
                current_movement_dir=null;
            }
            else{
                current_movement_dir=current_mouse_pos.angleFrom(centerpoint);
            }
            send_update_to_server();
        }
    };

    var process_firing_update=function(pt,state){
        if(current_firing!==state){
            current_firing=state;
            send_update_to_server();
        }
    };

    var process_boosting_update=function(state){
        if(current_boosting!==state){
            current_boosting=state;
            send_update_to_server();
        }
    };
};
DomGame.prototype.start=function(remote_endpoint,display_name){
    this._start(remote_endpoint,display_name);
};
DomGame.prototype.stop=function(){
    this._stop();
};