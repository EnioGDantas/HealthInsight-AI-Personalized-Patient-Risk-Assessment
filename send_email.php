<?php
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$message = $_POST['message'] ?? '';

if (empty($name) || empty($email) || empty($message)) {
    echo "Please fill out all fields.";
    exit;
}

$to = "enio.danttas@gmail.com"; // Substitua pelo seu e-mail
$subject = "New Collaboration Request from $name";
$body = "Name: $name\nEmail: $email\n\nMessage:\n$message";
$headers = "From: $email\r\nReply-To: $email\r\n";

if (mail($to, $subject, $body, $headers)) {
    echo "Message sent successfully!";
} else {
    echo "Error sending message.";
}
?>
