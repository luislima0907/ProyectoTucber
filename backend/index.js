import express from 'express'



app = express()
port = 3000

app.use(express.json())

app.get("/health", (req, res)=> {

    return res.send("status:alive")
})


app.listen(port, ()=>{

    console.log("the server is alive")
})