document.addEventListener('DOMContentLoaded', function () {

    updateOnlineUsersCount();
    const logger = Backendless.Logging.getLogger('FileSaveLogger');

    Backendless.UserService.getCurrentUser()
        .then(function (currentUser) {
            if (!currentUser) {
                alert("User not logged in");
                window.location.href = "../1practice/login.html";
                return;
            }

            const email = currentUser.email.replace(/[@.]/g, '_');
            //const profileLink = document.getElementById('profileLink');
            //profileLink.href = `profile.html?email=${currentUser.email}`;

            const folderContentList = document.getElementById('folderContentList');
            let currentItem = null;
            let currentFolderPath = null;
            const mainFolderPath = `users/${email}/`;
            const sharedFolderPath = `users/${email}/Shared-with-me`;

            function fetchFolderContent(folderPath, isSharedFolder) {
                Backendless.Files.listing(folderPath).then(function (files) {
                    folderContentList.innerHTML = '';
                    const title = document.getElementById('titleText');
                    if (folderPath !== mainFolderPath) {
                        title.textContent = folderPath.replace(/^.*\/(?!.*\/)([^/]+)\/?$/, '$1');
                    }
                    else {
                        title.textContent = "My Files";
                    }

                    const existingMessage = document.querySelector('.no-files-message');
                    if (existingMessage) {
                        existingMessage.remove();
                    }

                    if (files.length === 0) {
                        const noFilesMessage = document.createElement('p');
                        noFilesMessage.textContent = 'No files found in this folder.';
                        noFilesMessage.classList.add('no-files-message');
                        noFilesMessage.style.color = '#9b59b6';
                        document.querySelector('.content').appendChild(noFilesMessage);
                    } else {
                        files.forEach(file => {
                            const listItem = document.createElement('li');
                            const icon = file.size > 0 ? '📄' : '📁';

                            listItem.dataset.path = file.url;
                            if (!isSharedFolder) {
                                listItem.dataset.name = file.name;
                            } else {
                                const trimmedFileName = file.name.replace(/\.txt$/, '');
                                listItem.dataset.name = trimmedFileName;
                                file.name = trimmedFileName;
                            }

                            if (icon === '📄') {
                                if (!isSharedFolder) {
                                    const downloadUrl = `https://aholicspot-us.backendless.app/api/files/${file.url}`;
                                    listItem.innerHTML = `<a class="file-reference" href="${downloadUrl}" target="_blank">${icon} ${file.name}</a> <a href="${downloadUrl}" class="downloadLink"><i class="fas fa-download"></i></a>`;
                                    listItem.innerHTML += ` <a href="#" class="deleteLink">Delete</a>`;
                                } else {
                                    fetchSharedFileUrl(file.url)
                                        .then(({downloadUrl, isSuccess}) => {
                                            if (isSuccess) {
                                                listItem.innerHTML = `<a class="file-reference" href="${downloadUrl}" target="_blank">${icon} ${file.name}</a> <a href="#" class="sharedDownloadLink"><i class="fas fa-download"></i></a>`;
                                                const sharedDownloadLink = listItem.querySelector('.sharedDownloadLink');
                                                sharedDownloadLink.addEventListener('click', function (event) {
                                                    event.preventDefault();
                                                    downloadFile(downloadUrl, file.name);
                                                });
                                            } else {
                                                console.error("Error fetching download URL");
                                                deleteFileOrDirectory(file.url, listItem);
                                            }
                                        })
                                        .catch(error => {
                                            console.error("Error fetching download URL:", error);
                                        });
                                }

                            } else {
                                listItem.innerHTML = `${icon} ${file.name}`;
                                if (!isSharedFolder) {
                                    listItem.innerHTML += ` <a href="#" class="deleteLink">Delete</a>`;
                                }

                                if (file.name === 'Shared-with-me') {
                                    listItem.id = 'sharedWithMeFolder';
                                } else {
                                    listItem.className = 'folder';
                                }

                                listItem.addEventListener('dblclick', function (event) {
                                    event.stopPropagation();
                                    fetchFolderContent(file.url, file.name === 'Shared-with-me');
                                });
                            }
                            folderContentList.appendChild(listItem);
                        });
                    }

                    if (!isSharedFolder) {
                        const deleteLinks = document.querySelectorAll('.deleteLink');
                        deleteLinks.forEach(link => {
                            link.addEventListener('click', function (event) {
                                event.preventDefault();
                                const listItem = event.target.closest('li');
                                const filePath = listItem.dataset.path;
                                deleteFileOrDirectory(filePath, listItem);
                            });
                        });
                    }

                    const downloadLinks = document.querySelectorAll('.downloadLink');
                    downloadLinks.forEach(link => {
                        link.addEventListener('click', function (event) {
                            event.preventDefault();
                            const listItem = event.target.closest('li');
                            const fileName = listItem.dataset.name;
                            const url = `https://aholicspot-us.backendless.app/api/files/${listItem.dataset.path}`;
                            downloadFile(url, fileName);
                        });
                    });
                    currentFolderPath = folderPath;

                }).catch(function (error) {
                    alert(`Error fetching ${isSharedFolder ? "shared" : "folder"} content: ` + error.message);
                });
            }

            fetchFolderContent(mainFolderPath, false);


            // Extracting the link to the shared file
            function fetchSharedFileUrl(filePath) {
                let isSuccess = false;
                return fetch(`https://aholicspot-us.backendless.app/api/files/${filePath}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch file: ${response.statusText}`);
                        }
                        return response.text();
                    })
                    .then(content => {
                        const downloadUrl = content.trim();
                        isSuccess = true;
                        return downloadUrl;
                    })
                    .then(downloadUrl => {
                        return fetch(downloadUrl)
                            .then(response => {
                                if (response.status === 400) {
                                    isSuccess = false;
                                }
                                return { downloadUrl, isSuccess };
                            })
                            .catch(error => {
                                return { error, isSuccess: false };
                            });
                    })
                    .catch(error => {
                        return { error, isSuccess: false };
                    });
            }


            // Deleting file or directory
            function deleteFileOrDirectory(filePath, listItem) {
                const isDirectory = listItem.innerText.includes('📁');

                if (listItem.dataset.name === "Shared-with-me") {
                    showPopup("Deleting the system file is not allowed.");
                    return;
                }
                if (isDirectory) {
                    Backendless.Files.removeDirectory(filePath)
                        .then(function () {
                            folderContentList.style.pointerEvents = 'auto';
                            showPopup("Directory " + listItem.dataset.name + " was deleted!");
                            listItem.remove();
                            fetchFolderContent(currentFolderPath, false);
                        })
                        .catch(function (error) {
                            showPopup("Error deleting directory: " + error.message);
                        });
                } else {
                    Backendless.Files.remove(filePath)
                        .then(function () {
                            folderContentList.style.pointerEvents = 'auto';
                            showPopup("File " + listItem.dataset.name + " was deleted!");
                            listItem.remove();
                            fetchFolderContent(currentFolderPath, false);
                        })
                        .catch(function (error) {
                            showPopup("Error deleting file: " + error.message);
                        });
                }
            }


            // Downloading a file
            function downloadFile(url, fileName) {
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Network response was not ok: ${response.statusText}`);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        const a = document.createElement('a');
                        const objectUrl = URL.createObjectURL(blob);
                        a.href = objectUrl;
                        a.setAttribute('download', fileName);
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(objectUrl);
                    })
                    .catch(error => console.error('Error downloading file:', error));
            }


            // Sharing a file
            function shareFileWithUser(filePath) {
                showPromptPopup("Enter the email of the user you want to share the file with:", function(sharedUserEmail) {
                    if (sharedUserEmail) {
                        const queryBuilder = Backendless.DataQueryBuilder.create();
                        queryBuilder.setWhereClause(`email='${sharedUserEmail}'`);

                        // Search for users with the provided email
                        Backendless.Data.of(Backendless.User).find(queryBuilder)
                            .then(function (users) {
                                if (users.length > 0) {
                                    const sharedUser = users[0];
                                    const sharedFolderPath = `users/${sharedUser.email.replace(/[@.]/g, '_')}/Shared-with-me/`;
                                    const sharedFileName = `${filePath.split('/').pop()}.txt`;
                                    const sharedFileContent = `https://aholicspot-us.backendless.app/api/files/${filePath}`;

                                    Backendless.Files.saveFile(sharedFolderPath, sharedFileName, sharedFileContent)
                                        .then(function () {
                                            showPopup("File shared with " + sharedUserEmail + " successfully!");
                                        })
                                        .catch(function (error) {
                                            showPopup("Error saving shared file!");
                                        });
                                } else {
                                    showPopup("User with the provided email " + sharedUserEmail + " does not exist.");
                                }
                            })
                            .catch(function (error) {
                                showPopup("Error checking user existence: " + error.message);
                            });
                    }
                });
            }

            document.getElementById('shareOption').addEventListener('click', function () {
                if (currentItem) {
                    const filePath = currentItem.dataset.path;
                    if (currentItem.dataset.name === "Shared-with-me" || currentFolderPath === sharedFolderPath) {
                        showPopup("Sharing the system file is not allowed.");
                        return;
                    } else if (currentItem.innerText.includes('📁')) {
                        showPopup("You can't share a directory!");
                        return;
                    }
                    shareFileWithUser(filePath);
                }
                contextMenu.style.display = 'none';
            });


            // Uploading file
            const fileInput = document.getElementById('fileInput');
            const uploadButton = document.getElementById('uploadButton');
            uploadButton.addEventListener('click', function () {
                if (currentFolderPath === sharedFolderPath) {
                    showPopup("You cannot modify the system folder.");
                    return;
                }
                fileInput.click();
            });

            fileInput.addEventListener('change', function (event) {
                const file = event.target.files[0];
                if (file) {
                    const fileName = file.name;

                    Backendless.Files.listing(currentFolderPath)
                        .then(function (files) {
                            const fileExists = files.some(fileItem => fileItem.name === fileName);
                            if (fileExists) {
                                const fileExistsMessage = "A file with the same name already exists in this folder."
                                showPopup(fileExistsMessage);
                                logger.error(`File upload failed for user: ${email}. Error: ${fileExistsMessage}`);
                            } else {
                                Backendless.Files.upload(file, currentFolderPath, true)
                                    .then(function (uploadedFile) {
                                        showPopup("File " + fileName + " uploaded successfully!");
                                        fetchFolderContent(currentFolderPath, false);
                                    })
                                    .catch(function (error) {
                                        showPopup("Error uploading file: " + error.message);
                                        logger.error(`File upload failed for user: ${email}. Error: ${error.message}`);
                                    });
                            }
                        })
                        .catch(function (error) {
                            showPopup("Error checking file existence: " + error.message);
                        });
                }
            });


            // Creating new directory
            const createDirButton = document.getElementById('createDirButton');
            createDirButton.addEventListener('click', function () {
                if (currentFolderPath === sharedFolderPath) {
                    showPopup("You cannot modify the system folder.");
                    return;
                }
                showPromptPopup("Enter directory name:", function(dirName) {
                    const encodedDirName = encodeURIComponent(dirName.replace(/\s+/g, '-'));
                    const newDirPath = currentFolderPath + encodedDirName + '/';

                    Backendless.Files.exists(newDirPath)
                        .then(function (dirExists) {
                            if (dirExists) {
                                showPopup("A directory with the same name already exists.");
                            } else {
                                Backendless.Files.createDirectory(newDirPath)
                                    .then(function () {
                                        showPopup("Directory created successfully!");
                                        fetchFolderContent(currentFolderPath, false);
                                    })
                                    .catch(function (error) {
                                        showPopup("Error creating directory: " + error.message);
                                    });
                            }
                        })
                        .catch(function (error) {
                            showPopup("Error checking directory existence: " + error.message);
                        });
                });
            });


            // Renaming file
            function renameFileOrDirectory(oldPathName, newName) {
                const newPath = currentFolderPath + newName;
                Backendless.Files.exists(newPath)
                    .then(function (fileExists) {
                        if (fileExists) {
                            showPopup("A file or directory with the same name already exists.");
                        } else {
                            Backendless.Files.renameFile(oldPathName, newName)
                                .then(function (newPath) {
                                    fetchFolderContent(currentFolderPath, false);
                                    console.log("File has been renamed to: " + newPath);
                                    showPopup("File has been renamed to: " + newName);
                                })
                                .catch(function (error) {
                                    console.error("Error renaming file: " + error.message);
                                    showPopup("Error renaming file!");
                                });
                        }
                    })
                    .catch(function (error) {
                        console.error("Error checking file existence: " + error.message);
                        showPopup("Error renaming file!");
                    });
            }

            document.getElementById('renameOption').addEventListener('click', function () {
                if (currentItem) {
                    const oldPath = currentItem.dataset.path;
                    if (currentItem.dataset.name === "Shared-with-me" || currentFolderPath === sharedFolderPath) {
                        showPopup("Renaming the system file is not allowed.");
                        return;
                    }
                    showPromptPopup("Enter new name:", function(newName) {
                        if (newName && newName.trim()) {
                            renameFileOrDirectory(oldPath, newName.trim());
                        }
                    });
                }
                contextMenu.style.display = 'none';
            });

            // Back button to switch directories back
            const backButton = document.getElementById('backButton');
            backButton.addEventListener('click', function () {
                if (currentFolderPath !== mainFolderPath) {
                    currentFolderPath = currentFolderPath.substring(0, currentFolderPath.lastIndexOf('/')) + "/";
                    fetchFolderContent(currentFolderPath, currentFolderPath === sharedFolderPath);
                }
            });

            // Handling context menu
            folderContentList.addEventListener('contextmenu', function (event) {
                event.preventDefault();
                currentItem = event.target.closest('li');
                if (!currentItem) return;

                contextMenu.style.top = `${event.clientY}px`;
                contextMenu.style.left = `${event.clientX}px`;
                contextMenu.style.display = 'block';

                document.addEventListener('click', function () {
                    contextMenu.style.display = 'none';
                    currentItem.removeEventListener('click', () => {});
                }, { once: true });
            });
        })
        .catch(function (error) {
            alert("Error: " + error.message);
        });
});