var TokenStream=function(arr){
    this.data=arr||[];
    this.index=0;
};
TokenStream.prototype.read=function(){
    if(this.data.length<=this.index)throw new Error("End of stream!");
    return this.data[this.index++];
};
TokenStream.prototype.ended=function(){
    return (this.data.length<=this.index);
};



// little endian bytestream reader
var ByteReadStream=function(arrayBuffer){
    this.buffer=arrayBuffer;
    this.data=new Uint8Array(this.buffer);
    this.index=0;
};
ByteReadStream.prototype.readUint=function(byteCount){
    // reads a signed int.  includes some bit twiddling as javascript bitwise operators only work with 32 bit ints.
    if(this.data.length<this.index+byteCount)throw new Error("End of stream!");
    var ret=0;
    for(var i=0;i<byteCount;++i){
        var bytedata=this.data[this.index++];
        ret+=bytedata*Math.pow(2,i*8);
    }
    return ret;
};
ByteReadStream.prototype.readUint8=function(){
    return this.readUint(1);
};
ByteReadStream.prototype.readUint16=function(){
    return this.readUint(2);
};
ByteReadStream.prototype.readUint32=function(){
    return this.readUint(4);
};
ByteReadStream.prototype.readUint64=function(){
    return this.readUint(8);
};
ByteReadStream.prototype.readInt=function(byteCount){
    // reads a signed int.  includes some bit twiddling as javascript bitwise operators only work with 32 bit ints.
    if(this.data.length<this.index+byteCount)throw new Error("End of stream!");
    var neg=((this.data[this.index+byteCount-1]&128)!==0);
    var ret=0;
    for(var i=0;i<byteCount;++i){
        var bytedata=this.data[this.index++];
        if(neg){
            bytedata=(~bytedata)&255;
        }
        ret+=bytedata*Math.pow(2,i*8);
    }
    if(neg){
        ret=-(ret+1);
    }
    return ret;
};
ByteReadStream.prototype.readInt8=function(){
    return this.readInt(1);
};
ByteReadStream.prototype.readInt16=function(){
    return this.readInt(2);
};
ByteReadStream.prototype.readInt32=function(){
    return this.readInt(4);
};
ByteReadStream.prototype.readInt64=function(){
    return this.readInt(8);
};
ByteReadStream.prototype.readBool=function(){
    return this.readInt(1)!==0;
};
ByteReadStream.prototype.readString=function(){
    var len=this.readUint(4);
    if(this.data.length<this.index+len)throw new Error("End of stream!");
    var tmp_buffer_view=new Uint8Array(this.buffer,this.index,len);
    this.index+=len;
    return new TextDecoder("utf-8").decode(tmp_buffer_view);
};



// little endian bytestream writer
var ByteWriteStream=function(){
    this.buffer=new ArrayBuffer(8);
    this.data=new Uint8Array(this.buffer);
    this.index=0;
};
ByteWriteStream.prototype.reserve=function(bytes){
    if(this.index+bytes>this.data.length){
        var new_buffer=new ArrayBuffer(Math.max(this.data.length*2,this.index+bytes));
        var new_data=new Uint8Array(new_buffer);
        for(var i=0;i<this.index;++i){
            new_data[i]=this.data[i];
        }
        this.buffer=new_buffer;
        this.data=new_data;
    }
};
ByteWriteStream.prototype.writeUint=function(byteCount,value){
    this.reserve(byteCount);
    for(var i=0;i<byteCount;++i){
        this.data[this.index++]=value&255;
        value/=256;
    }
};
ByteWriteStream.prototype.writeUint8=function(value){
    this.writeUint(1,value);
};
ByteWriteStream.prototype.writeUint16=function(value){
    this.writeUint(2,value);
};
ByteWriteStream.prototype.writeUint32=function(value){
    this.writeUint(4,value);
};
ByteWriteStream.prototype.writeUint64=function(value){
    this.writeUint(8,value);
};
ByteWriteStream.prototype.writeInt=function(byteCount,value){
    this.reserve(byteCount);
    var neg=(value<0);
    if(neg){
        value=-(value+1);
    }
    for(var i=0;i<byteCount;++i){
        var bytedata=value&255;
        if(neg){
            bytedata=(~bytedata)&255;
        }
        this.data[this.index++]=bytedata;
        value/=256;
    }
};
ByteWriteStream.prototype.writeInt8=function(value){
    this.writeInt(1,value);
};
ByteWriteStream.prototype.writeInt16=function(value){
    this.writeInt(2,value);
};
ByteWriteStream.prototype.writeInt32=function(value){
    this.writeInt(4,value);
};
ByteWriteStream.prototype.writeInt64=function(value){
    this.writeInt(8,value);
};
ByteWriteStream.prototype.writeBool=function(value){
    this.writeInt(1,value?1:0);
};
ByteWriteStream.prototype.writeString=function(value){
    var encoded_buffer_view=new TextEncoder("utf-8").encode(value);
    if(encoded_buffer_view.length>=Math.pow(2,32)){
        throw new Error("String too long!");
    }
    this.writeUint(4,encoded_buffer_view.length);
    this.reserve(encoded_buffer_view.length);
    for(var i=0;i<encoded_buffer_view.length;++i){
        this.data[this.index++]=encoded_buffer_view[i];
    }
};
ByteWriteStream.prototype.getBuffer=function(){
    var ret_buffer=new ArrayBuffer(this.index);
    var ret_data=new Uint8Array(ret_buffer);
    for(var i=0;i<this.index;++i){
        ret_data[i]=this.data[i];
    }
    return ret_buffer;
};



var Point=function(x,y){
    if(x instanceof Point){ // copy constructor
        this.x=x.x;
        this.y=x.y;
        return;
    }
    this.x=x||0;
    this.y=y||0;
};
Point.fromStream=function(stream){
    if(stream instanceof TokenStream)return new Point(parseInt(stream.read(),10),parseInt(stream.read(),10));
    if(stream instanceof ByteReadStream)return new Point(stream.readInt32(),stream.readInt32());
    throw new Error("Invalid stream!");
};
Point.average=function(pt1,pt2){
    return new Point((pt1.x+pt2.x)/2,(pt1.y+pt2.y)/2);
}
Point.weightedAverage=function(pt1,weight1,pt2,weight2){
    return new Point((pt1.x*weight1+pt2.x*weight2)/(weight1+weight2),(pt1.y*weight1+pt2.y*weight2)/(weight1+weight2));
}
Point.prototype.angleFrom=function(pt){
    return Math.atan2(this.y-pt.y,this.x-pt.x);
};
Point.prototype.angleTo=function(pt){
    return pt.angleFrom(this);
};
Point.prototype.squareDistanceFrom=Point.prototype.squareDistanceTo=function(pt){
    var dx=this.x-pt.x;
    var dy=this.y-pt.y;
    return dx*dx+dy*dy;
};
Point.prototype.distanceFrom=Point.prototype.distanceTo=function(pt){
    return Math.sqrt(this.squareDistanceTo(pt));
};
Point.prototype.translate=function(pt){
    return new Point(this.x+pt.x,this.y+pt.y);
};
Point.prototype.translateByDirection=function(angle,distance){
    return new Point(this.x+Math.cos(angle)*distance,this.y+Math.sin(angle)*distance);
};



var Agent=function(location,mass,health,is_boosting,has_shield){
    this.location=location||new Point(0,0);
    this.mass=mass||0;
    this.health=health||Agent.MAX_HEALTH;
    this.is_boosting=!!is_boosting;
    this.has_shield=!!has_shield;
};
Agent.fromStream=function(stream){
    if(stream instanceof TokenStream)return new Agent(Point.fromStream(stream),parseInt(stream.read(),10),parseInt(stream.read(),10),!!parseInt(stream.read(),10),!!parseInt(stream.read(),10));
    if(stream instanceof ByteReadStream)return new Agent(Point.fromStream(stream),stream.readInt64(),stream.readInt32(),stream.readBool(),stream.readBool());
    throw new Error("Invalid stream!");
};
Agent.MAX_HEALTH=10;



var AgentProperties=function(display_name){
    this.display_name=display_name||"";
    this.spawntime=undefined; // this is in displayTime units.  undefined if it is not known.
};
AgentProperties.fromStream=function(stream){
    if(stream instanceof TokenStream)return new AgentProperties(stream.read());
    if(stream instanceof ByteReadStream)return new AgentProperties(stream.readString());
    throw new Error("Invalid stream!");
};



var Food=function(location,is_projectile){
    this.location=location||new Point(0,0);
    this.is_projectile=!!is_projectile;
};
Food.fromStream=function(stream){
    if(stream instanceof TokenStream)return new Food(Point.fromStream(stream),parseInt(stream.read(),10));
    if(stream instanceof ByteReadStream)return new Food(Point.fromStream(stream),stream.readBool());
    throw new Error("Invalid stream!");
};



var Projectile=function(location,angle){
    this.location=location||new Point(0,0);
    this.angle=angle||0;
};
Projectile.fromStream=function(stream){
    if(stream instanceof TokenStream)return new Projectile(Point.fromStream(stream),parseFloat(stream.read()));
    throw new Error("Invalid stream!");
};



// additional library functions:

var wraparound_average=function(a,b,mod){
    if(b<a){
        var tmp=a;
        a=b;
        b=tmp;
    }
    if(Math.abs(b-a)<Math.abs(a+mod-b)){
        return (a+b)/2;
    }
    else{
        return ((a+mod+b)/2)%mod;
    }
};

// TODO: wraparound for those objects
var in_area=function(pt_centre,pt_radius,pt_target){
    return (pt_target.x>=pt_centre.x-pt_radius.x&&pt_target.x<=pt_centre.x+pt_radius.x)&&(pt_target.y>=pt_centre.y-pt_radius.y&&pt_target.y<=pt_centre.y+pt_radius.y);
};