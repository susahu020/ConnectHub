export const SOP_TEMPLATE = `# Standard Operating Procedure: [Procedure Title]

## 1. Document Control
* **SOP ID:** SOP-KB-${Math.floor(100 + Math.random() * 900)}
* **Department:** [e.g., Engineering, Operations]
* **Effective Date:** ${new Date().toLocaleDateString()}
* **Version:** 1.0
* **Author:** [Author Name]

## 2. Objective & Purpose
This procedure defines the step-by-step process for [Objective of the procedure]. It ensures consistency, safety, and compliance with company standards.

## 3. Scope
This SOP applies to all employees, contractors, and departments involved in [Process Scope].

## 4. Responsibilities
| Role | Responsibility |
| --- | --- |
| **Operator / Engineer** | Execute the steps as defined, log outcomes |
| **Supervisor / Manager** | Review execution, audit logs periodically |
| **Administrator** | Approve revisions, maintain master copy |

## 5. Procedure Steps
1. **Preparation:** Gather all required access, resources, and pre-requisites.
2. **Execution:**
   - Execute step A carefully.
   - Verify reading/output meets parameters.
3. **Verification:** Confirm execution results with the standard checklist.
4. **Logging:** File the completion log in the system.

## 6. Checklist & Verification
- [ ] Pre-execution safety and access checks completed.
- [ ] Process executed as per steps.
- [ ] Output verified against criteria.
- [ ] Supervisor signed off.

## 7. Reference Documents
* [Files & Documents](/files)
* Related SOPs: None
`;

export const HR_TEMPLATE = `# HR Document: [Document Title]

## 1. Document Overview
* **Document Ref:** HR-DOC-${Math.floor(100 + Math.random() * 900)}
* **Effective Date:** ${new Date().toLocaleDateString()}
* **Applicability:** All Employees / Full-time staff
* **Published By:** Human Resources

## 2. Objective
This document outlines the guidelines, criteria, and administrative processes regarding [Topic Title, e.g., Employee Benefits, Remote Work Guidelines].

## 3. Core Guidelines
* **Onboarding & Eligibility:** [Describe who qualifies and when]
* **Guidelines:**
  1. Guideline Item A
  2. Guideline Item B
  3. Guideline Item C

## 4. Administrative Procedures
Follow these steps to submit claims or requests related to this document:
1. Complete the request form on the HR Portal.
2. Attach supporting receipts or documentation.
3. Await review and approval (typically within 3 business days).

## 5. Contact & Support
For questions or support regarding this policy, please reach out:
* **Department:** People Operations
* **Primary Contact:** [HR Contact Email/Slack]
`;

export const POLICY_TEMPLATE = `# Company Policy: [Policy Title]

## 1. Overview & Scope
This policy outlines the standards of conduct and compliance regarding [Policy Subject]. It governs all employees, contractors, and partners at ConnectHub.

## 2. Standards of Conduct
* **Rule A:** Employees must maintain high standards of [Topic].
* **Rule B:** Any violation of these standards will lead to investigation.

## 3. Compliance & Audits
ConnectHub conducts periodic audits to ensure compliance with this policy.
| Compliance Area | Audit Frequency | Lead Auditor |
| --- | --- | --- |
| Policy Training | Annually | HR Director |
| System Audits | Quarterly | InfoSec Officer |

## 4. Enforcement
Violations of this policy may result in disciplinary action up to and including termination of employment.

## 5. Document Revision History
| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0 | ${new Date().toLocaleDateString()} | Compliance Officer | Initial Release |
`;

export const WIKI_TEMPLATE = `# Wiki Page: [Title]

## Overview
Brief introduction to the topic. Explain what this page is for and who it is aimed at.

## Background Context
Add any background context, links, or history here.

## Detailed Information
Add the main body of knowledge here. You can use tables, checklists, and code blocks:
- Item 1
- Item 2

## Resources & Links
* [Dashboard Home](/dashboard)
* [External Reference](https://google.com)
`;
