const mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'ejs');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(urlencodedParser);
app.use(bodyParser.json());

var methodOverride = require('method-override')
app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method
      delete req.body._method
      return method
    }
  }));


//tablename: learnerdetails,, columns:"learner_id","learner_name","learner_email","course_id"
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


app.get('/',(req,res)=>{
    res.render('index2');
})


var mesage = "Welcome to student info";

//Creating GET Router to fetch all the learner details from the MySQL Database
app.get('/learners' , (req, res) => {
    mysqlConnection.query("SELECT l.learner_id,l.learner_name,l.learner_email,l.mobile_number,GROUP_CONCAT(s.subject_name) AS 'subjects',GROUP_CONCAT(s.subject_chapter) AS 'chapters',GROUP_CONCAT(s.subject_imp) AS 'imps' FROM learnerdetails l LEFT JOIN sub_rel_learn rl ON rl.learnerid = l.learner_id LEFT JOIN subjectdetails s ON s.subject_id = rl.subjectid WHERE l.deleted = 0 GROUP BY l.learner_id", (err, rows, fields) => {
    if (!err){console.log("record fetched successfully");
    res.send({data:rows});}
    else{
    console.log(err);}
    })
    });


//Router to GET specific learner detail from the MySQL database
app.get('/learners/:id' , (req, res) => {
    mysqlConnection.query("SELECT l.learner_id,l.learner_name,l.learner_email,l.mobile_number,GROUP_CONCAT(s.subject_name),GROUP_CONCAT(s.subject_chapter),GROUP_CONCAT(s.subject_imp) FROM learnerdetails l LEFT JOIN sub_rel_learn rl ON rl.learnerid = l.learner_id LEFT JOIN subjectdetails s ON s.subject_id = rl.subjectid  WHERE l.learner_id = ? GROUP BY l.learner_id",[req.params.id], (err, results, fields) => {
    if (!err){
    res.render("index2",{data:results, message:"Welcome to student info"})}
    else{
    console.log(err);}
    })
    });
var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
var phoneformat = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;



// add or insert opertaion
app.post('/_insert', (req, res) => {
    let learner = req.body;
    var mobile = learner.mobile_number;
    var emailval = learner.learner_email;

if(mobile.match(phoneformat) && emailval.match(mailformat)){
    // valid email and phone



    var subjects = learner.course_Id;
    console.log(learner);
    var sql = "INSERT INTO learnerdetails (learner_name,learner_email,mobile_number) values (?,?,?)";
    mysqlConnection.query(sql, [learner.learner_name, learner.learner_email,learner.mobile_number ], (err, rows, fields) => {
        if (!err){
            console.log("New Learner added");
            var subjectArray = [];
            for(i=0;i<subjects.length;i++){ subjectArray.push([rows.insertId,subjects[i]]);  }
                console.log(subjectArray);
                var SQL2 = "INSERT INTO sub_rel_learn (learnerid, subjectid) VALUES ?";
                mysqlConnection.query(SQL2,[subjectArray],(err, rows, fields)=>{
                console.log("In relational table too added");
                mesage = 'New Learner Details added Successfully';
                console.log(rows,rows.affectedRows);
                console.log(mesage);
                res.send({data: mesage});
        })
    }else{
        console.log(err);}
    });






}// unvalid email
else{
    res.send({data:"You have entered invalid email and phone number,,..."});
}



});

/// Update operation
app.put('/update',(req,res)=>{
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
                        console.log('New Learner Details updated Successfully');
                            mesage = "Learners record updated successfully..";
                            res.send({data:mesage});
            })
        });

    }else{
        console.log(err);}
    });
});

app.get('/email/:email' , (req, res) => {
    mysqlConnection.query('SELECT count(learner_email) AS totalRec FROM learnerdetails WHERE learner_email = ?',[req.params.email], (err, results, fields) => {
    if (!err){
        if(results[0].totalRec==0){ res.send({How:"No"});
            }else if(results[0].totalRec>0){ res.send({How:"Exists"});  }
        } else { //sql error
    console.log(err);}
    })
    });


// delete data using id
app.delete('/learners/:id', (req, res) => {
    mysqlConnection.query("DELETE FROM sub_rel_learn WHERE learnerid = ?",[req.params.id] , (err, rows, fields) =>{
        if(!err){ console.log("Subject selection is deleted");
            mysqlConnection.query("UPDATE learnerdetails SET deleted = 1 WHERE learner_id = ?",[req.params.id] , (err, rows2, fields) =>{
                console.log("Learners and selected subjects are both record deleted successfully..");
                console.log(rows); console.log(rows2); console.log("both selection and student deleted");
                    mesage = "Learners record deleted successfully..";
                        console.log(mesage);
                        res.send({data: mesage});
        })  }
        else{
        console.log(err);}
    });
});