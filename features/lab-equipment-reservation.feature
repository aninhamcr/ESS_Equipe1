Feature: Laboratory computer reservation

As an enrolled student
I want to reserve laboratory computers in a room
So that I can guarantee access to computers at the desired time

Scenario: Create a pending computer reservation
    Given the room "Lab 01" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has no reservation from "10/04/2032 08:00" to "10/04/2032 10:00"
    And the reservation request has room "Lab 01", computer quantity "3", start time "10/04/2032 08:00", and end time "10/04/2032 10:00"
    When student "Vitoria" with CPF "12345678901" requests a computer reservation
    Then the reservation request should be accepted
    And the reservation should be stored with status "pending"
    And the stored reservation should have room "Lab 01", computer quantity "3", start time "10/04/2032 08:00", and end time "10/04/2032 10:00"

Scenario: Block reservation when room is under maintenance
    Given the room "Lab 02" has 10 computers and is under maintenance
    And the reservation request has room "Lab 02", computer quantity "2", start time "10/04/2032 14:00", and end time "10/04/2032 16:00"
    When student "Vitoria" with CPF "12345678901" requests a computer reservation
    Then the reservation request should be rejected
    And the response message should be "Room is under maintenance. Computer reservation not allowed"
    And no reservation should be stored for student CPF "12345678901"

Scenario: Allow reservations for different computers in the same room and time
    Given the room "Lab 03" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a reservation for "3" computers in room "Lab 03" from "10/04/2032 08:00" to "10/04/2032 10:00"
    And the reservation request has room "Lab 03", computer quantity "4", start time "10/04/2032 08:00", and end time "10/04/2032 10:00"
    When student "Carlos" with CPF "98765432100" requests a computer reservation
    Then the reservation request should be accepted
    And the reservation should be stored with status "pending"

Scenario: Block reservation when student already has a reservation at the same time
    Given the room "Lab 04" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a reservation for "2" computers in room "Lab 04" from "10/04/2032 08:00" to "10/04/2032 10:00"
    And the reservation request has room "Lab 04", computer quantity "1", start time "10/04/2032 09:00", and end time "10/04/2032 11:00"
    When student "Vitoria" with CPF "12345678901" requests a computer reservation
    Then the reservation request should be rejected
    And the response message should be "You already have a reservation at this time"

Scenario: List student computer reservations
    Given the room "Lab 05" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a reservation for "2" computers in room "Lab 05" from "10/04/2032 08:00" to "10/04/2032 10:00"
    When student with CPF "12345678901" requests their computer reservations
    Then the reservation list should be returned successfully
    And the reservation list should contain room "Lab 05", status "pending", and computer quantity "2"

Scenario: Edit a pending computer reservation
    Given the room "Lab 06" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a pending reservation for "2" computers in room "Lab 06" from "10/04/2032 08:00" to "10/04/2032 10:00"
    And the reservation update has room "Lab 06", computer quantity "4", start time "10/04/2032 09:00", and end time "10/04/2032 11:00"
    When student "Vitoria" with CPF "12345678901" requests to update that computer reservation
    Then the reservation should be updated successfully
    And the stored reservation should have room "Lab 06", computer quantity "4", start time "10/04/2032 09:00", and end time "10/04/2032 11:00"

Scenario: Block edit of a confirmed computer reservation
    Given the room "Lab 07" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a confirmed reservation for "2" computers in room "Lab 07" from "10/04/2032 08:00" to "10/04/2032 10:00"
    And the reservation update has room "Lab 07", computer quantity "4", start time "10/04/2032 09:00", and end time "10/04/2032 11:00"
    When student "Vitoria" with CPF "12345678901" requests to update that computer reservation
    Then the update request should be rejected
    And the response message should be "Only pending reservations can be edited"

Scenario: Cancel a pending computer reservation
    Given the room "Lab 08" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a pending reservation for "2" computers in room "Lab 08" from "10/04/2032 08:00" to "10/04/2032 10:00"
    When student "Vitoria" with CPF "12345678901" requests to cancel that computer reservation
    Then the reservation should be canceled successfully
    And the reservation should no longer be stored

Scenario: Block cancellation of a confirmed computer reservation
    Given the room "Lab 09" has 10 computers and is not under maintenance
    And student "Vitoria" with CPF "12345678901" has a confirmed reservation for "2" computers in room "Lab 09" from "10/04/2032 08:00" to "10/04/2032 10:00"
    When student "Vitoria" with CPF "12345678901" requests to cancel that computer reservation
    Then the cancellation request should be rejected
    And the response message should be "Only pending reservations can be canceled"

# Route/API tests

Scenario: Reject computer reservation for an unknown user
    Given the room "Integration Lab" has 10 computers and is not under maintenance
    And no user is registered with CPF "52998224725"
    And the reservation request has room "Integration Lab", computer quantity "2", start time "10/08/2032 08:00", and end time "10/08/2032 10:00"
    When unregistered student "Integration Student" with CPF "52998224725" requests a computer reservation
    Then the response status should be "404"
    And the response message should be "User not found"

Scenario: Reject computer reservation for an inactive user
    Given the room "Integration Lab" has 10 computers and is not under maintenance
    And inactive student "Integration Student" with CPF "52998224725" is registered
    And the reservation request has room "Integration Lab", computer quantity "2", start time "10/08/2032 08:00", and end time "10/08/2032 10:00"
    When student "Integration Student" with CPF "52998224725" requests a computer reservation
    Then the response status should be "403"

Scenario: Reject computer reservation when user name does not match
    Given the room "Integration Lab" has 10 computers and is not under maintenance
    And active student "Registered Name" with CPF "52998224725" is registered
    And the reservation request has room "Integration Lab", computer quantity "2", start time "10/08/2032 08:00", and end time "10/08/2032 10:00"
    When student "Different Name" with CPF "52998224725" requests a computer reservation
    Then the response status should be "401"

Scenario: Reject computer reservation with start time in the past
    Given the room "Integration Lab" has 10 computers and is not under maintenance
    And student "Integration Student" with CPF "52998224725" has no reservation from "08/01/2020 10:10" to "08/01/2020 11:10"
    And the reservation request has room "Integration Lab", computer quantity "2", start time "08/01/2020 10:10", and end time "08/01/2020 11:10"
    When student "Integration Student" with CPF "52998224725" requests a computer reservation
    Then the response status should be "400"
    And the response message should be "Start time cannot be in the past"

Scenario: Reject computer reservation conflicting with the student's room reservation
    Given the room "Integration Lab" has 10 computers and is not under maintenance
    And student "Integration Student" with CPF "52998224725" has a room reservation from "10/08/2032 09:00" to "10/08/2032 11:00"
    And the reservation request has room "Integration Lab", computer quantity "2", start time "10/08/2032 08:00", and end time "10/08/2032 10:00"
    When student "Integration Student" with CPF "52998224725" requests a computer reservation
    Then the response status should be "400"
    And the response message should be "You already have a reservation at this time"

# Integration tests

Scenario: Process pending computer reservations through the administrator workflow
    Given two pending computer reservations exist for the administrator workflow
    When the administrator lists and decides both computer reservations
    Then one computer reservation should be confirmed and the other denied

Scenario: Deny a pending computer reservation when maintenance is confirmed
    Given a pending computer reservation conflicts with a maintenance request
    When maintenance is confirmed for the room
    Then the conflicting computer reservation should be denied

Scenario: Update expired computer reservations automatically
    Given expired pending and confirmed computer reservations exist
    When the reservation scheduler processes expired reservations
    Then the pending reservation should be denied and the confirmed reservation completed

Scenario: Deny pending computer reservations when the student account is deactivated
    Given an active student has a pending computer reservation
    When the student account is deactivated
    Then the student's computer reservation should be denied

# Unit tests for internal service methods

Scenario: Internal validation rejects a start time in the past
    Given a start time in the past
    When the internal start time validation is executed
    Then the internal validation should fail with status "400" and message "Start time cannot be in the past"

Scenario: Internal validation rejects a room under maintenance
    Given a room object under maintenance
    When the internal room maintenance validation is executed
    Then the internal validation should fail with status "400" containing "maintenance"

Scenario: Internal validation rejects an unknown user
    Given no user is registered with CPF "00000000000"
    When the internal active user lookup is executed for CPF "00000000000"
    Then the internal validation should fail with status "404" and message "User not found"

Scenario: Internal validation detects a time conflict for the same student
    Given student "Unit Student" with CPF "11122233344" has a reservation for "2" computers in room "Unit Lab" from "10/04/2032 08:00" to "10/04/2032 10:00"
    When the internal user conflict validation checks CPF "11122233344" from "10/04/2032 09:00" to "10/04/2032 11:00"
    Then the internal validation should fail with status "400" and message "You already have a reservation at this time"

Scenario: Internal validation rejects a request above the available computer capacity
    Given the room "Unit Lab" has 10 computers and is not under maintenance
    And student "First Student" with CPF "11122233344" has a reservation for "7" computers in room "Unit Lab" from "10/04/2032 08:00" to "10/04/2032 10:00"
    When the internal capacity validation requests "4" computers in room "Unit Lab" from "10/04/2032 08:00" to "10/04/2032 10:00"
    Then the internal validation should fail with status "400" containing "Only 3 computers are available"
