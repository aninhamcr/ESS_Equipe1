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
