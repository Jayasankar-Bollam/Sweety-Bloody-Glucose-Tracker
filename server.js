const express = require("express")
require("dotenv").config()

const pool=require("./config/db");

const app =express();
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("Server is running");

});

app.get("/users",async(req,res)=>{
    try{
        const result= await pool.query("SELECT*FROM users");
        res.status(200).json(result.rows);
    }
    catch (error){
        console.error("Database Error:",error);
        res.status(500).json({error:error.message});
    }
});

app.listen(process.env.PORT || 5000,()=>{
    console.log("Server running on port 5000")
})