var server = require('ws').Server;
var ser = new server({port:5001});

const ROUGH_WIDTH = 416; 
const ROUGH_HEIGHT = 240;
var receivedMessage;
var playerMax=0;
var playerSurvive;
var playerX, playerY;
var playerWin=[];

var sendCountWileGameBefore=0;
var sendCountWileGame=0;
var playerSendCount=[];
var playerSendCountBefore=[];
var killedByChecker=[];


const SERVER_PREPARE=0, SERVER_PLAYING=1;
var serverMode=SERVER_PREPARE;



ser.on('connection',function(ws){

    ws.on('message',function(message){
        let r = message+"";
        console.log("received: "+r);
        receivedMessage = r.split(',');
        let s=sendToClient();
        if (s!=="")
        {
            console.log("send: "+s);
            ser.clients.forEach(function(client){
                client.send(s);
            });
        }

    });

    ws.on('close',function(){
        console.log(`I lost a client in Mode=${serverMode}`);

        if (serverMode==SERVER_PREPARE) 
        {//準備中ならやり直し
            ser.clients.forEach(function(client){
                client.send("init");
            });
            serverInit();
            console.log("game restarted");
        }
    });

});


_ = setInterval(freezeChecker, 500);

console.log("game02 server is running up!");
//return;


function serverInit()
{
    playerX=[];
    playerY=[];
    playerWin=[];

    serverMode=SERVER_PREPARE;
    playerMax=0;
}


function gameInit()
{
    playerX=[];
    playerY=[];
    playerSendCount=[];
    playerSendCountBefore=[];
    for(let i=0; i<playerMax; i++)
    {
        let x=ROUGH_WIDTH/2-16;
        let y=ROUGH_HEIGHT/2-16;
        let t = (i/playerMax)*2*Math.PI;
        x+=Math.cos(t)*64
        y+=Math.sin(t)*64

        playerX.push(parseInt(x,10));
        playerY.push(parseInt(y,10));
        playerSendCount.push(1);
        playerSendCountBefore.push(0);
    }
    serverMode=SERVER_PLAYING;
    playerSurvive=playerMax;
    killedByChecker=[];
}




function sendToClient()
{
    let mes=receivedMessage
    //console.log(mes, mes[0]);
    let ret=[];
    switch (serverMode)
    {
        case SERVER_PREPARE:
        {//準備中
            if (mes[0]=="getId")
            {
                ret.push("sendId");
                ret.push(playerMax);
                ret.push(mes[1]);
                playerWin.push(mes[2]);
                playerMax++;
            }
            if (mes[0]=="start")
            {
                ret.push("start");
                if (mes[1]==0) mes[1]--;
                ret.push(mes[1]);
                if (mes[1]==-1) 
                {
                    ret.push(playerMax);
                    gameInit();
                    for (let i=0; i<playerMax; i++)
                    {
                        ret.push(playerX[i]);
                        ret.push(playerY[i]);
                        ret.push(playerWin[i]);
                    }
                }
                
            }
            break;
        }


        case SERVER_PLAYING:
        {
            if (mes[0]=="locate")
            {
                let id=mes[1];
                let x=mes[2];
                let y=mes[3];
                playerX[id]=x; playerY[id]=y;

                if (x!=-1 && killedByChecker.length>0)
                {//フリーズチェッカーに引っかかったのあったらそれに上書き
                    id=killedByChecker.shift();
                    x=-1; y=0;
                }

                if (x==-1)
                {
                    ret.push("kill");
                    ret.push(id);
                    ret.push(playerSurvive);
                    playerSurvive--;
                    if (playerSurvive==0) serverInit();
                }
                else if (id==0 || (playerSurvive==1))
                {//データ送信
                    ret.push("locate");
                    for (let i=0; i<playerMax; i++)
                    {
                        ret.push(playerX[i]);
                        ret.push(playerY[i]);
                    }
                }
                
                sendCountWileGame++;
                playerSendCount[id]++;
                break;
            }
        }
    }
    //console.log(ret);

    let ret1="";

    for (let i=0; i<ret.length; i++)
    {
        ret1+=ret[i]+",";
    }

    return ret1;
}





//フリーズチェック
function freezeChecker()
{
    if (serverMode==SERVER_PLAYING )
    {
        if (sendCountWileGame==sendCountWileGameBefore)
        {
            serverInit();
            serverMode=SERVER_PREPARE;
            console.log("sever initilaized by freezeChecker");
        }
        else
        {
            for (let i=0; i<playerMax; i++)
            {
                if (playerX[i]!=-1 && playerSendCountBefore[i]==playerSendCount[i])
                {//更新処理ないなら切断判定
                    //playerX[i]=-1;
                    //playerSurvive--;
                    killedByChecker.push(i);
                    console.log(`kill player ${i} by disconnected`);
                }
                else
                {
                    playerSendCountBefore[i]=playerSendCount[i];
                }
            }
            }
    }
    
    sendCountWileGameBefore=sendCountWileGame;

    //console.log("checked");
}













