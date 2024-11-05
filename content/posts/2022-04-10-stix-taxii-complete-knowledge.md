---
title: "STIX/TAXII - Complete Knowledge"
date: "2022-04-10"
tags:
  - STIX
  - TAXII
  - Threat Intelligence
  - python
toc: true
math: true
bold: true
nomenu: false
---

## Introduction 

### STIX
What is STIX and what is TAXII? In the most simple terms STIX is a model of Threat Intelligence that is represented in motivations, abilities, capabilities and response objects. Those objects are then represented in either JSON (STIX 2) or XML (STIX 1).

Here is a very simple representation of STIX Objects in a graph.
![STIX Example](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bsuw7lnfzefu81oft2fq.png)
[Explanation of the example](https://oasis-open.github.io/cti-documentation/examples/sighting-of-an-indicator)
 
The data can be helpful for preventing or mitigating various kinds of attacks that can be expressed with STIX. All the list of the examples you can find in their [official example page](https://oasis-open.github.io/cti-documentation/stix/examples).

### TAXII

The STIX data has to be relayed in some way, that's why we have the TAXII Server. It is a simple web server specifically created for storing and sharing that kind of data.

#### TAXII 1.x Structure

The TAXII 1.2 Server has the following structure:

- Discovery Service - Within a POST request to their discovery URL (which should be pointed by the Server maintainers).
- Collection Management URL - The service that has the collections with STIX objects.
- Channels - Push/Subscribe pattern.

The full list of features for TAXII1 can be found in their official documentation:
- https://docs.oasis-open.org/cti/taxii/v1.1.1/taxii-v1.1.1-part3-http.html
- https://taxiiproject.github.io/releases/1.1/TAXII_Overview.pdf
- https://www.oasis-open.org/committees/download.php/57324/OASIS

#### TAXII 2.x Structure

For the newer versions of the TAXII Server we have the following structure:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2my74ivbmrhswj1nd83b.png) 

- `/discovery` - Discovers the paths to the different services provided by the Server.
- `api_roots` - Provides the API URLs for the different types of Collection Management.
    - `collections` - Provides the available collections for the given `api_root`.
        - `collection/objects` - Provides a list of STIX Objects in a given collection

You can see that this is very similar to the TAXII 1.x servers, there isn't much of a difference in the structure besides that the `collection_management_url` is `api_root` in TAXII 2.x. 

The full list of features for TAXII2 can be found in their [official documentation](https://docs.oasis-open.org/cti/taxii/v2.1/csprd01/taxii-v2.1-csprd01.html).

#### TAXII Servers and Threat Intelligence Providers

The information about this is very scarce so I've gathered a quick list of the known providers for STIX data.

|Resource|URL|Description|Data Type|
|--- |--- |--- |--- |
|AlienVault OTX |https://otx.alienvault.com/api| Requires an account, provides data in various ways including a TAXII Server.             |STIX 1.x|
| Threat Connect | https://threatconnect.com/stix-taxii/                                                            | Requires an account, Paid service, (consumes and provides) threat intel. | STIX 1.x/2.x   |
| EcleticIQ | https://www.taxiistand.com/                                                                      | Test TAXII (v1x) server. (quite unstable and inconsistent)                               | STIX 1.x |
| Limo - Anomali | https://www.anomali.com/resources/limo                                                           | Test TAXII (v1x/v2x) server. Somewhat unstable but mostly fine during tests.| STIX 1.x/2.x|

## Tools for STIX/TAXII

The main tool for creating/parsing or generating STIX data is going to be Python, since that all of the tools created are written in Python. Of course there are other alternatives but currently that's the most common one. 

Other tools that might come in handy.

|Tool   |Description  	|Version 	|
|---	|---	        |---	        |
|[stix-shifter](https://github.com/opencybersecurityalliance/stix-shifter)| Translates STIX to various other Threat Intelligence formats such as Carbon Black Cloud Query and others| STIX 1.x/2.x |
|[stix2](https://github.com/oasis-open/cti-python-stix2) | The main python package to parse and use/create STIX2 data.|STIX 2.x| 
|[stix2-validator](https://github.com/oasis-open/cti-stix-validator)| Provides a validation for the STIX2 data, can be used to validate your data from your sources.| STIX 2.x |
|[stix2-slider](https://github.com/oasis-open/cti-stix-slider)| Transforms STIX2 content to STIX1.2| STIX 2.x |
|[stix2-elevator](https://github.com/oasis-open/cti-stix-elevator)| Transforms STIX1 data to STIX2.x| STIX 1.x |
|[stix](https://github.com/STIXProject/python-stix)| The main python package for STIX1 data.| STIX 1.x |
|[stix-validator](https://github.com/STIXProject/stix-validator)| Validating STIX1 data.| STIX 1.x |
|[stix2-patterns](https://github.com/oasis-open/cti-pattern-validator)| Validator and Pattern Parser for STIX 2.x Patterns| STIX 2.x|
|[taxii2-client](https://github.com/oasis-open/cti-taxii-client/)| Python Client for TAXII 2 Servers | TAXII 2.x |
|[cabby](https://github.com/EclecticIQ/cabby/)| Python Client for TAXII 1 Servers| TAXII 1.x|


## Snippets and Gists 

- https://gist.github.com/syrull/6a2614560fb0474df166a51bcb34990d (Creating a TAXII2 Client for LimoAnomali) 
- https://gist.github.com/syrull/73b1798f90c4109a13ef9fceb1f2f858 (Creating a TAXII1 Client for OTXAlienVault)
