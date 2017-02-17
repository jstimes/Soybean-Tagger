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
  if (!isset($_GET['author']))
    throw new Exception("Missing author");

  $id = getNextImage($_GET['author']);
  echo json_encode(array(
    "next_image" => $id,
    "image_url" => "/api/getImage.php?id=" . $id
  ));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array(
    "errorMessage" => $e->getMessage()
  ));
}

?>
