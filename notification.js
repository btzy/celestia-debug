// time_to_remove_after_ended: milliseconds to remove from data after time is up
var GameNotificationService=function(time_to_remove_after_ended){
    this.lastRetrievedTime=undefined;
    this.data=[]; // {message,key,ttl,time_started}
    this.pendingStart=[]; // {message,key,ttl}
    this.timeToRemoveAfterEnded=time_to_remove_after_ended||0;
};

// message is an opaque object
// ttl is optional, in milliseconds
// key is optional, a string for use when removing the message prematurely
GameNotificationService.prototype.add=function(message,key,ttl){
    this.pendingStart.push({message:message,key:key,ttl:ttl});
};

// removes notification by key
// key must not be undefined!
GameNotificationService.prototype.remove=function(key){
    var new_pendingStart=[];
    this.pendingStart.forEach(function(el){
        if(el.key!==key){
            new_pendingStart.push(el);
        }
    });
    this.pendingStart=new_pendingStart;
    
    var lastRetrievedTime=this.lastRetrievedTime;
    this.data.forEach(function(el){ // this.lastRetrievedTime will not be undefined if this.data.length>0
        if(el.key===key){
            if(el.ttl===undefined||el.ttl>lastRetrievedTime-el.time_started){
                el.ttl=lastRetrievedTime-el.time_started;
            }
        }
    });
};

// time is a required argument indicating the current display time
// callback(message,time_from_start,time_from_end,key)
GameNotificationService.prototype.forEachNotification=function(time,callback){
    var that=this;
    
    this.lastRetrievedTime=time;
    this.pendingStart.forEach(function(el){
        el.time_started=time;
        that.data.push(el);
    });
    this.pendingStart=[];
    
    var new_data=[];
    var timeToRemoveAfterEnded=this.timeToRemoveAfterEnded;
    this.data.forEach(function(el){
        if(el.ttl===undefined||el.time_started+el.ttl+timeToRemoveAfterEnded>time){
            new_data.push(el);
        }
    });
    this.data=new_data;
    
    this.data.forEach(function(el){
        callback(el.message,time-el.time_started,time-el.time_started-el.ttl,el.key);
    });
};