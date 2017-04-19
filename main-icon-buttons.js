// this file consists of the button icons
// they are below the name, and are 44*44px (css pixels)


var shuffle=function(arr){
    for(var i=arr.length;i>0;--i){
        var idx=Math.floor(Math.random()*i);
        var tmp=arr[idx];
        arr[idx]=arr[i-1];
        arr[i-1]=tmp;
    }
};

var roundedWeightedAverage=function(fraction,n1,n2){
    return Math.round(n1*(1-fraction)+n2*fraction);
};

var printMixColor=function(fraction,color1,color2){
    return "rgb("+roundedWeightedAverage(fraction,color1[0],color2[0])+","+roundedWeightedAverage(fraction,color1[1],color2[1])+","+roundedWeightedAverage(fraction,color1[2],color2[2])+")";
};

// returns triangle distribution from 0 to 1
var getTriangleRandom=function(){
    var rand=Math.random();
    if(rand<0.5){
        return (1-Math.pow(rand*2,2))/2;
    }
    else{
        return Math.pow((rand-0.5)*2,2)/2+0.5;
    }
};





var drawLeaderboardButtonBase=function(ctx){
    ctx.lineCap="butt";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(7,34);
    ctx.lineTo(37,34);
    ctx.stroke();
};

var drawLeaderboardButtonBar=function(ctx,center_x,top_y){
    ctx.lineCap="round";
    ctx.lineWidth=4;
    ctx.fillRect(center_x-3,top_y,6,32-top_y);
    ctx.beginPath();
    ctx.moveTo(center_x-1,top_y);
    ctx.lineTo(center_x+1,top_y);
    ctx.stroke();
};

var drawLeaderboardButtonImage=function(ctx){
    ctx.clearRect(0,0,44,44);
    
    ctx.fillStyle="rgb(192,192,192)";
    ctx.strokeStyle="rgb(192,192,192)";
    
    // bottom line
    drawLeaderboardButtonBase(ctx);
    /*ctx.lineCap="butt";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(7,34);
    ctx.lineTo(37,34);
    ctx.stroke();*/
    
    // first place
    drawLeaderboardButtonBar(ctx,22,10);
    /*ctx.lineCap="round";
    ctx.lineWidth=4;
    ctx.fillRect(19,10,6,22);
    ctx.beginPath();
    ctx.moveTo(21,10);
    ctx.lineTo(23,10);
    ctx.stroke();*/
    
    // second place
    drawLeaderboardButtonBar(ctx,13,16);
    /*ctx.lineCap="round";
    ctx.lineWidth=4;
    ctx.fillRect(10,16,6,16);
    ctx.beginPath();
    ctx.moveTo(12,16);
    ctx.lineTo(14,16);
    ctx.stroke();*/
    
    // third place
    drawLeaderboardButtonBar(ctx,31,22);
    /*ctx.lineCap="round";
    ctx.lineWidth=4;
    ctx.fillRect(28,22,6,10);
    ctx.beginPath();
    ctx.moveTo(30,22);
    ctx.lineTo(32,22);
    ctx.stroke();*/
};

var LeaderboardButton=function(canvas){
    this.canvas_device_pixel_scale=window.devicePixelRatio||1;
    this.canvas=canvas;
    this.canvas.width=this.canvas.offsetWidth*this.canvas_device_pixel_scale;
    this.canvas.height=this.canvas.offsetHeight*this.canvas_device_pixel_scale;
    this.ctx=this.canvas.getContext("2d");
    this.ctx.scale(this.canvas_device_pixel_scale,this.canvas_device_pixel_scale);
    this.ctx.translate((this.canvas.offsetWidth-44)/2,(this.canvas.offsetHeight-44)/2);
    drawLeaderboardButtonImage(this.ctx);
    this.animRunning=false;
    this.currentheights=[16,10,22];
};

LeaderboardButton.prototype.stop=function(){
    this.animRunning=false;
};

LeaderboardButton.prototype.startglow=function(){
    this.colorStartTime=Date.now();
    this.colorEndTime=undefined;
    this.animRunning=true;
    if(this.animFrameCanceller!==undefined){
        this.animFrameCanceller();
        this.animFrameCanceller=undefined;
    }
    var _that=this;
    var lastheights=this.currentheights.slice();
    var targetheights=[16,10,22];
    shuffle(targetheights);
    var timeoflastheight=Date.now();
    var greycolor=[192,192,192];
    var colors=[[255,255,128],[128,255,255],[255,128,255]];
    var whitecolor=[255,255,255];
    var animFrameId=undefined;
    var animCallback=function(){
        if(animFrameId===undefined)return;
        if(_that.animRunning){
            var timeForFullColor=500;
            var timeForFullHeight=800;
            var date_now=Date.now();
            var colorRatio=((_that.colorEndTime)?(Math.min(timeForFullColor,_that.colorEndTime-_that.colorStartTime)-(date_now-_that.colorEndTime)):Math.min(timeForFullColor,date_now-_that.colorStartTime))/timeForFullColor;
            if(_that.colorEndTime&&colorRatio<=0&&timeoflastheight+timeForFullHeight<=date_now){
                drawLeaderboardButtonImage(_that.ctx);
                _that.animRunning=false;
                _that.currentheights=[16,10,22];
            }
            else{
                // draw anim
                colorRatio=Math.max(0,colorRatio);
                while(date_now-timeoflastheight>=timeForFullHeight){
                    timeoflastheight+=timeForFullHeight;
                    lastheights=targetheights.slice();
                    shuffle(targetheights);
                }
                if(_that.colorEndTime&&!(targetheights[0]===16&&targetheights[1]===10&&targetheights[2]===22)){
                    lastheights=_that.currentheights.slice();
                    timeoflastheight=date_now;
                    targetheights=[16,10,22];
                }
                _that.ctx.clearRect(0,0,44,44);
                var mixColor=printMixColor(colorRatio,greycolor,whitecolor);
                _that.ctx.fillStyle=mixColor;
                _that.ctx.strokeStyle=mixColor;
                drawLeaderboardButtonBase(_that.ctx);
                for(var i=0;i<3;++i){
                    var mixColor=printMixColor(colorRatio,greycolor,colors[i]);
                    _that.ctx.fillStyle=mixColor;
                    _that.ctx.strokeStyle=mixColor;
                    _that.currentheights[i]=(lastheights[i]*(timeoflastheight+timeForFullHeight-date_now)+targetheights[i]*(date_now-timeoflastheight))/timeForFullHeight;
                    drawLeaderboardButtonBar(_that.ctx,13+9*i,_that.currentheights[i]);
                }
            }
        }
        if(_that.animRunning){
            animFrameId=window.requestAnimationFrame(animCallback);
        }
        else{
            animFrameId=undefined;
        }
    };
    animFrameId=window.requestAnimationFrame(animCallback);
    this.animFrameCanceller=function(){
        if(animFrameId!==undefined)window.cancelAnimationFrame(animFrameId);
        animFrameId=undefined;
    };
};

LeaderboardButton.prototype.stopglow=function(){
    this.colorEndTime=Date.now();
};




var drawJoinButton=function(ctx,colorStyle,horizontalOffset){
    ctx.save();
    ctx.clearRect(0,0,44+4,44);
    ctx.translate(horizontalOffset,0);
    ctx.strokeStyle=colorStyle;
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.lineWidth=3;
    ctx.moveTo(10,22);
    ctx.lineTo(34,22);
    ctx.moveTo(34,22);
    ctx.lineTo(24,12);
    ctx.moveTo(34,22);
    ctx.lineTo(24,32);
    ctx.stroke();
    ctx.restore();
};

var JoinButton=function(canvas){
    this.canvas_device_pixel_scale=window.devicePixelRatio||1;
    this.canvas=canvas;
    this.canvas.width=this.canvas.offsetWidth*this.canvas_device_pixel_scale;
    this.canvas.height=this.canvas.offsetHeight*this.canvas_device_pixel_scale;
    this.ctx=this.canvas.getContext("2d");
    this.ctx.scale(this.canvas_device_pixel_scale,this.canvas_device_pixel_scale);
    this.ctx.translate((this.canvas.offsetWidth-44)/2,(this.canvas.offsetHeight-44)/2);
    //drawJoinButtonImage(this.ctx);
    this.animData=[]; // {majorAngle, minorAngle, majorVelocity, minorVelocity, majorRadius, minorRadius, spawnTime} // all velocities are angular.
    var _that=this;
    var maxPoints=10;
    var timeBetweenPoints=100;
    var majorRadius=13;
    var majorVelocityMean=0.005; // radians per millisecond
    var majorVelocityRadius=0.0025;
    var minorVelocityMean=0.015; // radians per millisecond
    var minorVelocityRadius=0.0075;
    var minorRadiusMean=2; // logical (css) pixels
    var minorRadiusRadius=2;
    
    var timeForFullAlpha=300;
    var timeForFullColor=500;
    var greycolor=[192,192,192];
    var whitecolor=[255,255,255];
    
    var timeoutId=undefined;
    var addPoint=function(){
        if(timeoutId===undefined)return;
        
        _that.animData.push({majorAngle:Math.random()*2*Math.PI, minorAngle:Math.random()*2*Math.PI, majorVelocity:(getTriangleRandom()-0.5)*(majorVelocityRadius*2)+majorVelocityMean, minorVelocity:(getTriangleRandom()-0.5)*(minorVelocityRadius*2)+minorVelocityMean, majorRadius:majorRadius, minorRadius:(getTriangleRandom()-0.5)*(minorRadiusRadius*2)+minorRadiusMean, spawnTime:Date.now()});
        
        if(_that.animData.length<maxPoints){
            timeoutId=window.setTimeout(addPoint,timeBetweenPoints);
        }
        else{
            timeoutId=undefined;
        }
    };
    timeoutId=window.setTimeout(addPoint,0);
    var animFrameId=undefined;
    var animCallback=function(){
        if(animFrameId===undefined)return;
        _that.ctx.clearRect(0,0,44,44);
        var date_now=Date.now();
        var colorFraction;
        if(!_that.colorStartTime){
            colorFraction=0;
        }
        else if(!_that.colorEndTime){
            colorFraction=Math.min(1,(date_now-_that.colorStartTime)/timeForFullColor);
        }
        else{
            colorFraction=Math.max(0,Math.min(1,(_that.colorEndTime-_that.colorStartTime)/timeForFullColor)-(date_now-_that.colorEndTime)/timeForFullColor);
        }
        _that.animData.forEach(function(obj){
            var currentMajorAngle=obj.majorAngle+(date_now-obj.spawnTime)*obj.majorVelocity;
            var currentMinorAngle=obj.minorAngle+(date_now-obj.spawnTime)*obj.minorVelocity;
            var realRadius=obj.majorRadius+obj.minorRadius*Math.sin(currentMinorAngle);
            var pt_x=22+realRadius*Math.cos(currentMajorAngle);
            var pt_y=22+realRadius*Math.sin(currentMajorAngle);
            _that.ctx.fillStyle=printMixColor(colorFraction,greycolor,whitecolor);
            _that.ctx.globalAlpha=Math.min(1,(date_now-obj.spawnTime)/timeForFullAlpha);
            _that.ctx.beginPath();
            _that.ctx.arc(pt_x,pt_y,1.5,-Math.PI,Math.PI);
            _that.ctx.closePath();
            _that.ctx.fill();
        });
        _that.ctx.globalAlpha=1;
        animFrameId=window.requestAnimationFrame(animCallback);
    };
    animFrameId=window.requestAnimationFrame(animCallback);
    this.animFrameCanceller=function(){
        if(timeoutId!==undefined){
            window.clearTimeout(timeoutId);
            timeoutId=undefined;
        }
        if(animFrameId!==undefined){
            window.cancelAnimationFrame(animFrameId);
            animFrameId=undefined;
        }
    };
};

JoinButton.prototype.stop=function(){
    if(this.animFrameCanceller){
        this.animFrameCanceller();
        this.animFrameCanceller=undefined;
    }
};

JoinButton.prototype.setready=function(){
    if(this.animFrameCanceller){
        this.animFrameCanceller();
        this.animFrameCanceller=undefined;
    }
    /*var joinPoints=this.animData.map(function(){
        return getRandomJoinPoint();
    });*/
    var greycolor=[192,192,192];
    var whitecolor=[255,255,255];
    var timeForFullColor=500;
    
    var jiggleTime=200;
    var jiggleDelta=4;
    
    var _that=this;
    
    var animFrameId=undefined;
    var animCallback=function(){
        if(animFrameId===undefined)return;
        var date_now=Date.now();
        var colorFraction;
        if(!_that.colorStartTime){
            colorFraction=0;
        }
        else if(!_that.colorEndTime){
            colorFraction=Math.min(1,(date_now-_that.colorStartTime)/timeForFullColor);
        }
        else{
            colorFraction=Math.max(0,Math.min(1,(_that.colorEndTime-_that.colorStartTime)/timeForFullColor)-(date_now-_that.colorEndTime)/timeForFullColor);
        }
        var colorStyle=printMixColor(colorFraction,greycolor,whitecolor);
        if(_that.jiggleStartTime===undefined)_that.jiggleStartTime=_that.colorStartTime;
        var jiggleOffset;
        if(_that.jiggleStartTime!==undefined){
            if(_that.jiggleStartTime+jiggleTime<=date_now){
                _that.jiggleStartTime=undefined;
                jiggleOffset=0;
            }
            else{
                var timediff=date_now-_that.jiggleStartTime;
                jiggleOffset=Math.min(timediff,jiggleTime-timediff)*jiggleDelta*2/jiggleTime;
            }
        }
        else{
            jiggleOffset=0;
        }
        drawJoinButton(_that.ctx,colorStyle,jiggleOffset);
        if(colorFraction!==0||jiggleOffset!==0||_that.colorEndTime===undefined)animFrameId=window.requestAnimationFrame(animCallback);
        else animFrameId=undefined;
    };
    animFrameId=window.requestAnimationFrame(animCallback);
    this.animFrameCanceller=function(){
        if(timeoutId!==undefined){
            window.clearTimeout(timeoutId);
            timeoutId=undefined;
        }
        if(animFrameId!==undefined){
            window.cancelAnimationFrame(animFrameId);
            animFrameId=undefined;
        }
    };
    this.tryStartJiggleAnim=function(){
        if(animFrameId===undefined)animFrameId=window.requestAnimationFrame(animCallback);
    };
};

JoinButton.prototype.startglow=function(){
    this.colorStartTime=Date.now();
    this.colorEndTime=undefined;
    if(this.tryStartJiggleAnim)this.tryStartJiggleAnim();
};

JoinButton.prototype.stopglow=function(){
    this.colorEndTime=Date.now();
};