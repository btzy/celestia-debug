// All times here are just numbers which increases with time.
// They are not Date objects.

//var ct1=0,ct2=0;

var InterpolationDelayEngine=function(weightedAverager,cloner){
    this.weightedAverager=weightedAverager;
    this.cloner=cloner||function(x){return x;};
    this.prevLocation=undefined;
    this.currLocation=undefined;
    this.lastRetrievedLocation=undefined;
    this.prevTime=undefined;
    this.currTime=undefined;
    this.lastRetrievedTime=undefined;
};
InterpolationDelayEngine.prototype.set=function(pt,time){ // assumes that every subsequent call will have a later time than the previous one
    if(!time)console.log("notime1");
    time=time||new Date().getTime();
    //if(time<this.currTime)console.log("time error!");
    if(this.lastRetrievedTime&&this.lastRetrievedTime<=time){
        this.prevLocation=this.cloner(this.lastRetrievedLocation||pt);
        this.prevTime=this.lastRetrievedTime||time;
        this.currLocation=this.cloner(pt);
        this.currTime=time;
        //console.log("a!: "+(this.currTime-this.prevTime).toString()+" "+this.currTime.toString()+" "+this.prevTime.toString());
        //++ct1;
    }
    else{
        this.prevLocation=this.cloner(this.currLocation||pt);
        this.prevTime=this.currTime||time;
        this.currLocation=this.cloner(pt);
        this.currTime=time;
        //++ct2;
    }
    //console.log(ct1+" "+ct2);
};
InterpolationDelayEngine.prototype.get=function(time){ // assumes that every subsequent call will have a later time than the previous one
    if(!time)console.log("notime2");
    time=time||new Date().getTime();
    this.lastRetrievedLocation=this.weightedAverager(this.currLocation,time-this.prevTime,this.prevLocation,this.currTime-time);
    this.lastRetrievedTime=time;
    return this.cloner(this.lastRetrievedLocation);
};



var InterpolatorMap=function(interpolationEngineCreator,weightedAverager,cloner){
    this.interpolationEngineCreator=interpolationEngineCreator;
    this.weightedAverager=weightedAverager;
    this.cloner=cloner;
    this.map=new Map(); // contains a this.interpolationEngine
};
InterpolatorMap.prototype.getData=function(time){ // returns map of data
    if(!time)console.log("c2");
    time=time||new Date().getTime();
    var ret=new Map();
    this.map.forEach(function(val,key){
        ret.set(key,val.get(time));
    });
    return ret;
};
InterpolatorMap.prototype.get=function(key,time){
    if(!time)console.log("c1");
    time=time||new Date().getTime();
    var val=this.map.get(key);
    return ((val!==undefined)?val.get(time):undefined);
};
InterpolatorMap.prototype.forEach=function(callback,time){
    if(!time)console.log("c3");
    time=time||new Date().getTime();
    var that=this;
    this.map.forEach(function(val,key){
        callback(val.get(time),key,that);
    });
}
InterpolatorMap.prototype.setData=function(dataMap,time){
    if(!time)console.log("c4");
    time=time||new Date().getTime();
    var prevMap=this.map;
    this.map=new Map();
    var that=this;
    dataMap.forEach(function(val,key){
        var prevVal=prevMap.get(key);
        if(prevVal===undefined)prevVal=that.interpolationEngineCreator(that.weightedAverager,that.cloner);
        prevVal.set(val,time);
        that.map.set(key,prevVal);
    });
};
InterpolatorMap.prototype.set=function(key,val,time){
    if(!time)console.log("c5");
    time=time||new Date().getTime();
    if(!this.map.has(key)){
        this.map.set(key,this.interpolationEngineCreator(this.weightedAverager,this.cloner));
    }
    this.map.get(key).set(val,time);
};
InterpolatorMap.prototype.forEachEngine=function(callback){
    var that=this;
    this.map.forEach(function(val,key){
        callback(val,key,that);
    });
};