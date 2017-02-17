<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function getNextImage($author)
{
  $conn = db_connect();

  $stmt = $conn->prepare("SELECT Images.image_id FROM Images WHERE Images.image_id NOT IN (SELECT image_id FROM MarkedData WHERE author = ?) LIMIT 1");
  $stmt->bind_param("s", $author);
  $stmt->execute();

  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if ($row === null)
    return -1;  // done

  return $row['image_id'];
}

try {
  echo json_encode(array(
    "next_image" => getNextImage($author)
  ));
} catch (Exception $e) {
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
