const mysql = require('mysql');
const express = require('express');
const bodyparser = require('body-parser');

var app = express();  // configure express server
app.use(bodyparser.json());

//mysql details
var mysqlConnection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password: '',
    database: 'learners',
    multipleStatements: true
});

mysqlConnection.connect((err)=> {
    if(!err)
    console.log('Connection Established Successfully');
    else
    console.log('Connection Failed!'+ JSON.stringify(err,undefined,2));
    });

//Establish the server connection
//PORT ENVIRONMENT VARIABLE
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}..`));


//Creating GET Router to fetch all the learner details from the MySQL Database
app.get('/learners' , (req, res) => {
    mysqlConnection.query('SELECT l.learner_id,l.learner_name,l.learner_email,l.mobile_number,GROUP_CONCAT(s.subject_name),GROUP_CONCAT(s.subject_chapter),GROUP_CONCAT(s.subject_imp) FROM learnerdetails l LEFT JOIN sub_rel_learn rl ON rl.learnerid = l.learner_id LEFT JOIN subjectdetails s ON s.subject_id = rl.subjectid GROUP BY l.learner_id', (err, rows, fields) => {
    if (!err){console.log("record fetched successfully");
    res.send(rows);}
    else{
    console.log(err);}
    })
    } );

//Router to GET specific learner detail from the MySQL database
app.get('/learners/:id' , (req, res) => {
    mysqlConnection.query('SELECT l.learner_id,l.learner_name,l.learner_email,l.mobile_number,GROUP_CONCAT(s.subject_name),GROUP_CONCAT(s.subject_chapter),GROUP_CONCAT(s.subject_imp) FROM learnerdetails l LEFT JOIN sub_rel_learn rl ON rl.learnerid = l.learner_id LEFT JOIN subjectdetails s ON s.subject_id = rl.subjectid  WHERE l.learner_id = ? GROUP BY l.learner_id',[req.params.id], (err, rows, fields) => {
    if (!err){
    res.send(rows);}
    else{
    console.log(err);}
    })
    } );


// add or insert opertaion
app.post('/_insert', (req, res) => {
    let learner = req.body;
    var subjects = learner.course_Id;
    console.log(learner);
    var sql = "INSERT INTO learnerdetails (learner_name,learner_email,mobile_number) values (?,?,?)";
    mysqlConnection.query(sql, [learner.learner_name, learner.learner_email,learner.mobile_number ], (err, rows, fields) => {
        if (!err){console.log("New Learner added");
        var subjectArray = [];
            for(i=0;i<subjects.length;i++){ subjectArray.push([rows.insertId,subjects[i]]);  }
        console.log(subjectArray);
        var SQL2 = "INSERT INTO sub_rel_learn (learnerid, subjectid) VALUES ?";
        mysqlConnection.query(SQL2,[subjectArray],(err, rows, fields)=>{
            console.log("In relational table too added");
            res.send('New Learner Details added Successfully');
        })
    }else{
        console.log(err);}
    });
});


/// Update operation
app.put('/learners',(req,res)=>{
    let learner = req.body;
    var subjects = learner.course_Id;
    console.log(learner);
    var sql = "UPDATE learnerdetails SET learner_name = ? , learner_email = ? , mobile_number = ? WHERE learner_id = ? ";
        mysqlConnection.query(sql,[learner.learner_name,learner.learner_email,learner.mobile_number,learner.learner_id],(err,rows,fields) => {
            if(!err){
                console.log("Learner Updates Successfully !!!");
                mysqlConnection.query("DELETE FROM sub_rel_learn WHERE learnerid = ?",[learner.learner_id],(err,rows,fields) => {
                    var subjectArray = [];
                    for(i=0;i<subjects.length;i++){ subjectArray.push([learner.learner_id,subjects[i]]);  }
                        console.log("deleted from relation and subject table");
                        console.log(subjectArray);
                    var SQL2 = "INSERT INTO sub_rel_learn (learnerid, subjectid) VALUES ?";
                    mysqlConnection.query(SQL2,[subjectArray],(err, rows, fields)=>{
                        console.log("In relational table subjects added");
                        res.send('New Learner Details updated Successfully');
            })
        });

    }else{
        console.log(err);}
    });
});

// delete data using id
app.delete('/learners/:id', (req, res) => {
    mysqlConnection.query("DELETE FROM sub_rel_learn WHERE learnerid = ?",[req.params.id] , (err, rows, fields) =>{
        if(!err){ console.log("Subject selection is deleted");
            mysqlConnection.query("DELETE FROM learnerdetails WHERE learner_id = ?",[req.params.id] , (err, rows2, fields) =>{
        res.send("Learners and selected subjects are both record deleted successfully..");
        console.log(rows); console.log(rows2); console.log("both selection and student deleted");
        })  }
        else{
        console.log(err);}
    });
});
