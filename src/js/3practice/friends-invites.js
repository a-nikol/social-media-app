document.addEventListener("DOMContentLoaded", () => {
    const addFriendButton = document.getElementById("addFriendButton");
    const emailInput = document.getElementById("emailInput");
    const pendingFriendsContainer = document.getElementById("pendingFriendsContainer");
    const invitedFriendsContainer = document.getElementById("invitedFriendsContainer");

    addFriendButton.addEventListener('click', debounce(addFriend, 1000));
    async function addFriend() {
        const email = emailInput.value.trim();
        if (!email) {
            alert("Please enter an email.");
            return;
        }

        try {
            // Find user by email
            const queryBuilder = Backendless.DataQueryBuilder.create().setWhereClause(`email = '${email}'`);
            const users = await Backendless.Data.of("Users").find(queryBuilder);
            if (users.length === 0) {
                showPopup("No user found with this email.");
                return;
            }
            const friendId = users[0].objectId;

            const currentUser = await Backendless.UserService.getCurrentUser();
            if (currentUser.objectId === friendId) {
                showPopup("You cannot send an invite to yourself.");
                return;
            }

            const inviteQueryBuilder = Backendless.DataQueryBuilder.create()
                .setWhereClause(`(friendId = '${friendId}' AND ownerId = '${currentUser.objectId}' AND status = 'Pending') OR (friendId = '${currentUser.objectId}' AND ownerId = '${friendId}' AND status = 'Pending')`);
            const existingInvites = await Backendless.Data.of("FriendInvite").find(inviteQueryBuilder);
            if (existingInvites.length > 0) {
                showPopup("An invite with this user already exists.");
                return;
            }

            const friendsQueryBuilder = Backendless.DataQueryBuilder.create();
            friendsQueryBuilder.setRelated(['friends']);
            friendsQueryBuilder.setWhereClause(`objectId = '${currentUser.objectId}'`);
            const result = await Backendless.Data.of("Users").find(friendsQueryBuilder);
            const friends = result[0].friends || [];
            if (friends.some(friend => friend.objectId === friendId)) {
                showPopup("This user is already in your friends list.");
                return;
            }

            const invite = {
                status: "Pending",
                ownerId: currentUser.objectId
            };
            const savedInvite = await Backendless.Data.of("FriendInvite").save(invite);
            await Backendless.Data.of('FriendInvite').setRelation({objectId: savedInvite.objectId}, 'friendId', [{objectId: friendId}]);

            emailInput.value = "";
            showPopup("Invite for " + email + " was sent!");
            loadPendingInvites();

        } catch (error) {
            console.error("Error adding friend:", error);
        }
    }

    async function cancelInvite(inviteId, inviteElement) {
        try {
            await Backendless.Data.of("FriendInvite").remove(inviteId);
            inviteElement.remove();

            if (pendingFriendsContainer.children.length === 0) {
                displayNoInvitesMessage(pendingFriendsContainer, 'No pending invites.');
            }
        } catch (error) {
            console.error("Error cancelling invite:", error);
        }
    }

    async function acceptInvite(inviteId, inviteElement) {
        try {
            const currentUser = await Backendless.UserService.getCurrentUser();
            const invite = await Backendless.Data.of('FriendInvite').findById(inviteId);
            const ownerId = invite.ownerId;

            await Backendless.Data.of('Users').addRelation(currentUser.objectId, 'friends', [ownerId]);
            await Backendless.Data.of('Users').addRelation(ownerId, 'friends', [currentUser.objectId]);

            await Backendless.Data.of("FriendInvite").remove(inviteId);
            showPopup("Friend was added!");
            inviteElement.remove();

            if (invitedFriendsContainer.children.length === 0) {
                displayNoInvitesMessage(invitedFriendsContainer, 'No invites.');
            }
        } catch (error) {
            console.error("Error accepting invite:", error);
        }
    }

    function displayNoInvitesMessage(container, message) {
        const noInvitesMessage = document.createElement('p');
        noInvitesMessage.textContent = message;
        noInvitesMessage.classList.add('no-files-message');
        noInvitesMessage.style.color = '#9b59b6';
        container.appendChild(noInvitesMessage);
    }



    async function loadPendingInvites() {
        try {
            const currentUser = await Backendless.UserService.getCurrentUser();
            pendingFriendsContainer.innerHTML = '';
            const queryBuilder = Backendless.DataQueryBuilder.create().setWhereClause(`status = 'Pending' AND ownerId = '${currentUser.objectId}'`);
            const invites = await Backendless.Data.of("FriendInvite").find(queryBuilder);

            if (invites.length === 0) {
                displayNoInvitesMessage(pendingFriendsContainer, 'No pending invites.');
                return;
            }

            const loadFriendDetails = async (inviteId) => {
                const loadRelationsQueryBuilder = Backendless.LoadRelationsQueryBuilder.create().setRelationName('friendId');
                const friends = await Backendless.Data.of('FriendInvite').loadRelations(inviteId, loadRelationsQueryBuilder);
                return friends.length > 0 ? friends[0] : null;
            };

            for (const invite of invites) {
                const friend = await loadFriendDetails(invite.objectId);
                if (friend) {
                    const friendItem = document.createElement("div");
                    friendItem.classList.add("friend-item");
                    friendItem.innerHTML = `
                        <div class="friend-pfp">
                            <img src="${friend.profile_pic || '../2practice/prof_pic.jpg'}" alt="Friend pfp">
                        </div>
                        <div class="friend-details">
                            <p class="friend-email">${friend.email}</p>
                            <p class="friend-name">${friend.name}</p>
                        </div>
                        <button class="delete-button" data-invite-id="${invite.objectId}">Cancel</button>
                    `;
                    pendingFriendsContainer.appendChild(friendItem);

                    const cancelButton = friendItem.querySelector(".delete-button");
                    cancelButton.addEventListener("click", () => cancelInvite(invite.objectId, friendItem));
                }
            }
        } catch (error) {
            console.error("Error loading pending invites:", error);
        }
    }

    async function loadInvitedFriends() {
        try {
            const currentUser = await Backendless.UserService.getCurrentUser();
            invitedFriendsContainer.innerHTML = '';
            const queryBuilder = Backendless.DataQueryBuilder.create();
            queryBuilder.setRelated(['friendId']);
            queryBuilder.setWhereClause(`status = 'Pending' AND friendId = '${currentUser.objectId}'`);

            const invites = await Backendless.Data.of("FriendInvite").find(queryBuilder);
            if (invites.length === 0) {
                displayNoInvitesMessage(invitedFriendsContainer, 'No invites.');
                return;
            }
            const loadOwnerDetails = async (ownerId) => {
                const owner = await Backendless.Data.of("Users").findById(ownerId);
                return owner;
            };

            for (const invite of invites) {
                const owner = await loadOwnerDetails(invite.ownerId);

                if (owner) {
                    const inviteItem = document.createElement("div");
                    inviteItem.classList.add("friend-item");
                    inviteItem.innerHTML = `
                        <div class="friend-pfp">
                            <img src="${owner.profile_pic || '../2practice/prof_pic.jpg'}" alt="Owner pfp">
                        </div>
                        <div class="friend-details">
                            <p class="friend-email">${owner.email}</p>
                            <p class="friend-name">${owner.name}</p>
                        </div>
                        <div class="button-container">
                            <button class="accept-button" data-invite-id="${invite.objectId}">Accept</button>
                            <button class="delete-button" data-invite-id="${invite.objectId}">Cancel</button>
                        </div>
                    `;
                    invitedFriendsContainer.appendChild(inviteItem);

                    const acceptButton = inviteItem.querySelector(".accept-button");
                    acceptButton.addEventListener("click", () => acceptInvite(invite.objectId, inviteItem));

                    const cancelButton = inviteItem.querySelector(".delete-button");
                    cancelButton.addEventListener("click", () => cancelInvite(invite.objectId, inviteItem));
                }
            }

        } catch (error) {
            console.error("Error loading invites:", error);
        }
    }

    loadInvitedFriends();
    loadPendingInvites();

});
