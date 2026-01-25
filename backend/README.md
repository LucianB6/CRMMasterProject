# Backend build & run

## Quick start (Maven)
Run these commands from the repository root:

```bash
cd backend
mvn -DskipTests spring-boot:run
```

If you prefer to run from the repo root without changing folders, use:

```bash
mvn -f backend/pom.xml -DskipTests spring-boot:run
```

## Common compile error: `package com.salesway.ml.dto does not exist`
This error usually appears when compiling **only one file** (e.g., with `javac` on
`MlService.java`) without including the full source path. The backend uses
standard Maven source layout (`backend/src/main/java`), so make sure you compile
the entire module via Maven (commands above) or import the project as a Maven
module in your IDE so it marks `src/main/java` as a source root.
