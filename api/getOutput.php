<?php

//Just for testing, viewing output

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getNextImage()
{
  $conn = db_connect();

  $data = array();
  
  $sql = "SELECT * FROM Severity";
  
  $result = mysqli_query($conn, $sql);
  //$stmt->execute();

  //$res = $stmt->get_result();
   while($row = mysqli_fetch_assoc($result))
    {
        $data[] = $row;

    }


  return $data;
}

try {

  
  echo json_encode(getNextImage());
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
