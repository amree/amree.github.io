---
title: Exporting data from RDS to S3 using AWS Glue
date: 2020-10-05
tags: [aws]
---

## Overview

Why would we even want to do this? Just imagine if you have data that are
infrequently accessed. Keeping it in your RDS might costs you more than it
should. Besides, having big table is gonna cause you a bigger headache with your
database maintenance (indexing, auto vacuum, etc).

<!--more-->

What if we can store those data somewhere where it's gonna cost less and it's in
an even smaller size? You can read more about the cost-saving part
[here](https://dev.to/cloudforecast/using-parquet-on-athena-to-save-money-on-aws-3fac).
I'll be focusing on the how and not the why in this post.

Exporting data from RDS to S3 through AWS Glue and viewing it through AWS Athena
requires a lot of steps. But it’s important to understand the process from the
higher level.

IMHO, I think we can visualize the whole process as two parts, which are:

- Input: This is the process where we’ll get the data from RDS into S3 using AWS
  Glue
- Output: This is where we’ll use AWS Athena to view the data in S3

It’s important to note both processes require almost similar steps. We need to
specify the database and table for both of them.

Database and table don’t exactly carry the same meaning as our normal
PostgreSQL. The database in this context is more like containers for the tables
and doesn’t really have any extra configurations.

The table is a little bit different as it has a schema attached to it. The table
in AWS Glue is just the metadata definition that represents your data and it
doesn’t have data inside it. The data is available somewhere else. It can be in
RDS/S3/other places.

How do we create a table? We can either create it manually or use Crawlers in
AWS Glue for that. We can also create a table from AWS Athena itself.

The database and tables that you see in AWS Glue will also be available in AWS
Athena.

## Recommendations

- In order not to confuse ourselves, I think it’d better if we use different
  database names for the input and output. We need to differentiate between
  what’s the input and output for easier reference when we set up the AWS Glue
  Job.
- More will be added

## Steps

### Prerequisite

#### Security

>  These security configurations are required to prevent errors when we ran AWS
Glue

Amazon VPC Endpoints for Amazon S3:

- Go to VPC > Endpoints
- Create Endpoint
- Search by Services: S3 (com.amazonaws.ap-southeast-1.s3)
- Select your VPC
- Tick a Route Table ID
- Choose Full Access
- Create Endpoint

The result will be shown in the “Route Tables > Routes” page. There’ll be a new
route added with VPC as the target and S3 service as the destination

Reference: https://docs.aws.amazon.com/glue/latest/dg/vpc-endpoints-s3.html

RDS Security Group:

- Select the security group of the database that you want to use
- Edit inbound rules
- Add rule
- Type: All TCP
- Source: Custom and search for the security group name itself
- Save rules

#### Roles

This will allow Glue to call AWS service on our behalf

- Go to IAM > Roles > Create role
- Type of trusted identity: AWS Service
- Service: Glue
- Next
- Search and select AWSGlueServiceRole
- Next
- We can skip adding tags
- Next
- Roles: AWSGlueServiceDefault (can be anything)
- Create Role

#### Add Database Connections (for Input)

- Go to AWS Glue > Databases > Connections
- Click “Add Connection”
- Connection type: Amazon RDS
- Database Engine: PostgreSQL
- Next
- Instance: Choose an RDS
- Put the database details: name, username, and password
- Next
- Review and click Finish
- Use “Test Connection” in the “Connections” page to test it out (this might
  take a while)

#### Setup S3 access (for Output)

- Go to AWS Glue > Databases > Connections
- Click “Add Connection”
- Connection type: Network
- Next
- VPC: Select the same one as the RDS*
- Subnet: Select the same one as the RDS*
- Security Group: default*
- Next
- Review and click Finish

(*) Other options might work too, but I didn’t try them out.

### Add Databases

This will be the parent/container for the table. A table might come from the
input and output.

- Go to AWS Glue > Databases > Add database
- Database name: anything will do

I created for both. E.g: `myapp_input` and `myapp_output`

### Add Crawlers

Before we create a job to import the data, we need to set up our input table’s
schema. This schema will be used for the data input in the Job later.

Naming is hard. I decided to go with this format:
`rds_db_name_env_table_name_crawler`. It’s easier if we can grasp what the
crawler does from the name even though we can have a shorter name and put the
details in the description.

- Go to AWS Glue > Tables > Add tables > Add tables using a crawler
- Crawler name: Anything
- Crawler source type: Data stores
- Next
- Choose a data store: JDBC
- Connection: Choose the one we created above
- Include path: `db_name/public/table_name` (assuming we want to take data from
  table table_nameas we can use % as the wild card)
- Next
- Add another data store: No
- Next
- IAM role: Choose the one we created above (AWSGlueServiceDefault)
- Next
- Frequency
- Use Run on demand
- Next
- Configure the crawler’s output
- Database: Choose database for the crawler output (this will be the source for
  our Job later)
- Next
- Review and click Finish

The crawler that we’ve just defined is just to create a table with a schema
based on the RDS’s table that we just specified.

Let’s run it to see the output. Just go to the Crawlers page and select “Run
crawler”. It’ll take a moment before it starts and there’s no log when it’s
running (or at least I can’t find it yet). However, there’ll be a log once it’s
done. The only thing you can do to monitor its progress is to keep clicking the
Refresh icon on the Crawlers page.

Once it’s done, you’ll see the table created automatically in the Tables
section. You can filter out the list of the tables by going through Databases
first. You should see a table with defined schema similar to what you have in
RDS.

We need to add another crawler that will define the schema of our output. But
this time it’ll be for our S3 (which is the output)

- Go to AWS Glue > Tables > Add tables > Add tables using a crawler
- Crawler name: Anything (I chose `s3_db_name_env_table_name_crawler`)
- Next
- Crawler source type: Data stores
- Next
- Choose a data store: S3
- Connection: Use connection declared before for S3 access
- Crawl data in: Specified path in my account
- Include path: `s3://you-data-path/`. This will be the path where you’ll store
  the output from Job that you’ll create later. The output here means the Apache
  Parquet files. I chose: `s3://glue-dir/env/database_name/table_name/`
- Next
- Add another data store: No
- Next
- Choose IAM role
- Choose an existing IAM role
- IAM role: AWSGlueServiceRoleDefault
- Next
- Create a schedule for this crawler:
- Frequency: Run on demand
- Next
- Configure the crawler’s output:
- Database: A database where you’ll store the output from S3
- Next
- Review and click Finish

We’re not going to run this crawler yet as the S3 directory is empty. We’ll run
it once we’ve exported RDS data to S3.

### Add a job

For some unknown reason, I couldn’t get this to work without using AWS Glue
Studio. Maybe I’ll figure it out once I have more time. But I’ll just use AWS
Glue Studio for now:

- Open AWS Glue Studio in ETL section
- Choose "Create and manage jobs"
- Source: RDS
- Target: S3
- Click Create
- Click on the “Data source - JDBC” node
- Database: Use the database that we defined earlier for the input
- Table: Choose the input table (should be coming from the same database)
- You’ll notice that the node will now have a green check
- Click on the “Data target - S3 bucket” node
- Format: Glue Parquet
- Compression type: Snappy
- S3 Target location: This will the place where the parquet files will be
  generated. This path should also be the same as what we defined in our crawler
  for the output before. Remember, this is for the data, not for the schema. The
  crawler is responsible for the schema. I chose to use
  `s3://glue-dir/env/database_name/table_name`
- You’ll notice that the node will now have a green check
- Now go to “Job details” tab
- Name: Can be anything, I chose `rds_to_s3_db_name_env_table_name`
- IAM Role: Choose the role that we created before - AWSGlueServiceRoleDefault
- Expand “Advanced Properties”
- We’re going to specify some paths so that it won’t litter our top-level s3
- Script path: `s3://glue-dir/scripts/`
- Spark UI logs path: `s3://glue-dir/sparkHistoryLogs/`
- Temporary path: `s3://glue-dir/temporary/`
- Click Save
- Click “Run” to run the script. You can see the log in “Run details” tab. If
  everything is working as expected, you should files generated in
  `s3://glue-dir/env/database_name/table_name`

### Viewing the record using AWS Athena

Before we can view the output, we need to create a table/schema for those
parquet files. This is the job for the crawler (you can also create the table
manually if you want to). That’s what the second crawler does. Just run the
crawler and you’ll get a new table created if it’s new. Refer to previous steps
on how we run the first crawler.

To confirm the table has been created, just go to the database for the output
and then click on the “Tables ..” link. You should see it there. There’s also an
alert at the top of the Crawler index page once it has finished the job.

To view the record:

- Go to AWS Athena
- Select your database and table.
- Click on the three dots on the right side of the table name and choose Preview
  Table
- You’ll see some data in the Results


## References

- https://github.com/aws-samples/aws-glue-samples/blob/master/FAQ_and_How_to.md
- https://spark.apache.org/docs/2.1.0/sql-programming-guide.html
- https://aws.amazon.com/blogs/big-data/how-to-access-and-analyze-on-premises-data-stores-using-aws-glue/
- https://stackoverflow.com/questions/34948296/using-pyspark-to-connect-to-postgresql
- https://dev.to/cloudforecast/watch-out-for-unexpected-s3-cost-when-using-athena-5hdm
