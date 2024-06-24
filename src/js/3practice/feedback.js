document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('sendFeedbackButton').addEventListener('click', sendFeedback);
    function sendFeedback() {
        const feedbackType = document.getElementById('feedback-type').value;
        const message = document.getElementById('feedback-message').value;

        let subject;
        switch (feedbackType) {
            case 'error':
                subject = 'SocioHub Feedback: Error';
                break;
            case 'suggestion':
                subject = 'SocioHub Feedback: Suggestion';
                break;
            default:
                showPopup('Choose the type of feedback!');
                return;
        }
        if (!message) {
            showPopup('Message cannot be empty!');
            return;
        }

        var bodyParts = new Backendless.Bodyparts();
        bodyParts.textmessage = message;

        Backendless.Messaging.sendEmail(subject, bodyParts, ['anna.nikolaichuk@nure.ua'])
            .then(function (response) {
                showPopup("Feedback sent successfully!");
                console.log('Email sent:', response);

                document.getElementById('feedback-type').value = 'default';
                document.getElementById('feedback-message').value = '';
            })
            .catch(function (error) {
                showPopup('Error sending feedback! Try again later.');
                console.error('Error sending email:', error);
            });
    }
});