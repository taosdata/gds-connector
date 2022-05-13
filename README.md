# gds-connector

TDengine connector for Google Data Studio. This connector is based on TDengine's [RESTful](https://tdengine.com/docs/en/v2.0/connector#restful) APIs.
This document include these content:

* Prerequisite of using TDengine connector for Google Data Studio.

* Connect configuration information

* Relationship with Google Data Studio [ConceptType](https://developers.google.com/datastudio/connector/reference#concepttype) and [DataType](https://developers.google.com/datastudio/connector/reference#datatype)

* A simple using example.

## Prerequisite

* Need to [install TDengine server](https://tdengine.com/getting-started/install), however the server host must be accessible by Google Data Studio.

* Make sure that [taosadapter](https://github.com/taosdata/taosadapter#startstop-taosadapter) has been started  successfully.
  
## Connect Configuration Information Description

### URL

_**Necessary configuration**_

This URL used to send http request to TDengine through REST APIs.
URL format should follow this syntax: `http://hostname:port`. In the URL the hostname need to be accessible in public network. The follow is an example:

``` bash
http://norepeat.space:6041
```

### username

_**Necessary configuration**_

The user name which have the access priority of the database that you want to query. In the example, username is `root` and which is the default user for TDengine.

### password

_**Necessary configuration**_

The password  is correspond with the username you have enter in the previous text field. In the example, `taosdata` if default password to TDengine's default user `root`。

### database

_**Necessary configuration**_

The database name that contains the table(no matter it is a normal table,super table or a child table of ) you want to query data and make reports.In the example,we suggest we want to access database named `test`.

### table

_**Necessary configuration**_

The name of the table you want to connect with and query data to make a report.In the example,we will create a report for table `demo`.

**Notice** Currently the maximum of retrieve record for this  connector is 1000000 rows.

### Query range start date & end date

_**Optional configurations**_

Generally, these are two filter conditions which are used to limit the amount of retrieved data. They are two text fields in our [login page](https://github.com/taosdata/gds-connector/blob/master/resource/login_page.jpg),and the date should enter in `YYYY-MM-DD HH:MM:SS` format.
eg.

``` bash
2022-05-12 18:24:15
```

The `start date` defined the beginning timestamp of the query result. In other word, records early than this `start date` will not be retrieved.

The `end time` indicate the end timestamp of the query result.Which means that records later than this `end date` will not be retrieved.
These conditions are used in SQL statement's where clause like：

``` SQL
-- select * from table_name where ts >= start_date and ts <= end_date
select * from test.demo where ts >= '2022-05-10 18:24:15' and ts<='2022-05-12 18:24:15'
```

What's more, through these filters, you can improve data loading speed in your report.

## Match with Google Data Studio [ConceptType](https://developers.google.com/datastudio/connector/reference#concepttype) and [DataType](https://developers.google.com/datastudio/connector/reference#datatype)

### ConceptType

Currently, we set TDengine's TAG columns and timestamp columns as dimension, and other columns will be set to metrics.

### DataType

TDengine's data type mapping with Google Data Studio's field's time. You can refer the following matrix.
| TDengine's   data type | GDS's Datatype        |
|------------------------|-----------------------|
| BOOL                   | BOOLEAN               |
| TINYINT                | NUMBER                |
| SMALLINT               | NUMBER                |
| INT                    | NUMBER                |
| BITINT                 | NUMBER                |
| FLOAT                  | NUMBER                |
| DOUBLE                 | NUMBER                |
| TINYINT UNSIGNED       | NUMBER                |
| SMALLINT UNSIGNED      | NUMBER                |
| INT UNSIGNED           | NUMBER                |
| BIGINT UNSIGNED        | NUMBER                |
| BINARY                 | TEXT                  |
| NCHAR                  | TEXT                  |
| JSON                   | TEXT                  |
| TIMESTAMP              | YEAR_MONTH_DAY_SECOND |

## A Simple Example

refer report [template](https://datastudio.google.com/reporting/cee570dc-3bd7-4f79-9a12-2dbb3b90e461/page/4nfsC)

1. [login page](https://github.com/taosdata/gds-connector/blob/master/resource/login_page.jpg)

2. [filled connection configuration](https://github.com/taosdata/gds-connector/blob/master/resource/configuration.jpg)

3. [get connected](https://github.com/taosdata/gds-connector/blob/master/resource/getConnection.jpg)

4. [create a simple report](https://github.com/taosdata/gds-connector/blob/master/resource/report_template.jpg)
