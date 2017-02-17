<?php

ini_set('display_errors', 1);
error_reporting(-1);

require_once 'db.php';

function putData($image_id, $author, $paths, $severities)
{

  $conn = db_connect();

  $stmt = $conn->prepare("INSERT INTO MarkedData (image_id, author, path) VALUES (?, ?, ?)");
  $stmt->bind_param("iss", $image_id, $author, $paths);
  $stmt->execute();

  $mark_id = $stmt->insert_id;
  if ($mark_id <= 0)
    throw new Exception("error inserting into MarkedData");

  $stmt->close();

  $stmt = $conn->prepare("INSERT INTO Severity (mark_id, disease, severity) VALUES (?, ?, ?)");
  foreach ($severities as $kv) {
    // get the {"1": 42} into $disease and $sev
    // this is pretty jank
    foreach ($kv as $disease => $sev) break;

    $stmt->bind_param("iii", $mark_id, $disease, $sev);
    $stmt->execute();
  }

  $stmt->close();

  return $mark_id;
}

$body = file_get_contents('php://input');
$body = json_decode($body, true);

try {
  $mark_id = putData($body['image_id'], $body['author'], $body['paths'], $body['severities']);
  echo json_encode(array(
    "mark_id" => $mark_id
  ));
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(array ("errorMessage" => $e->getMessage()));
}

?>
