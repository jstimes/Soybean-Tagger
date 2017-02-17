USE soybean_tagger;

/*CREATE TABLE Diseases (
	disease_id int NOT NULL AUTO_INCREMENT,
	name VARCHAR(255) NOT NULL,
    
    PRIMARY KEY (disease_id)
);

CREATE TABLE Images (
	image_id int NOT NULL AUTO_INCREMENT,
	path VARCHAR(512) NOT NULL,
    PRIMARY KEY(image_id)
);

CREATE TABLE MarkedData (
	mark_id int NOT NULL AUTO_INCREMENT,
	image_id int NOT NULL,
    author VARCHAR(255) NOT NULL,
    
    path MEDIUMBLOB,
    
    PRIMARY KEY (mark_id),
    UNIQUE (image_id, author),
    FOREIGN KEY(image_id) REFERENCES Images(image_id)
);*/

CREATE TABLE Severity (
	mark_id int NOT NULL,
    disease int NOT NULL,
    severity int NOT NULL,
    
    PRIMARY KEY (mark_id, disease),
    FOREIGN KEY (mark_id) REFERENCES MarkedData(mark_id),
    FOREIGN KEY (disease) REFERENCES Diseases(disease_id)
);