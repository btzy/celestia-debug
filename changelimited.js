// All times here are just numbers which increases with time.
// They are not Date objects.

// calculator: function(lastRetrievedLocation,targetLocation,timeDifference). returns new location. should return targetLocation (same object) if it reaches targetLocation.
var ChangeLimitedDelayEngine=function(calculator,cloner){
    this.calculator=calculator;
    this.cloner=cloner||function(x){return x;};
    this.lastRetrievedLocation=undefined;
    this.targetLocation=undefined;
    this.lastRetrievedTime=undefined;
};
ChangeLimitedDelayEngine.prototype.set=function(pt){
    this.targetLocation=this.cloner(pt);
    if(!this.lastRetrievedLocation)this.lastRetrievedLocation=this.targetLocation;
};
ChangeLimitedDelayEngine.prototype.get=function(time){
    time=time||new Date().getTime();
    if(!this.targetLocation)return undefined;
    if(!this.lastRetrievedTime){
        this.lastRetrievedTime=time;
        return this.cloner(this.targetLocation);
    }
    if(this.lastRetrievedLocation===this.targetLocation){
        this.lastRetrievedTime=time;
        return this.cloner(this.targetLocation);
    }
    //console.log("mm");
    if(this.lastRetrievedLocation===undefined)console.log("assert");
    this.lastRetrievedLocation=this.calculator(this.lastRetrievedLocation,this.targetLocation,time-this.lastRetrievedTime);
    this.lastRetrievedTime=time;
    return this.cloner(this.lastRetrievedLocation);
};
