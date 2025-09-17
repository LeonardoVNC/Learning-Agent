import { useEffect, useState } from "react";
import { Modal, Table, Empty, message, Typography, Button } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import type { AbsenceRow } from "../interfaces/attendanceInterface";
import type { StudentInfo } from "../interfaces/studentInterface";
import useAttendance from "../hooks/useAttendance";

interface AbsencesModalProps {
  open: boolean;
  onClose: () => void;
  classId: string,
  student?: StudentInfo;
}

function AbsencesModal({
  open,
  onClose,
  classId,
  student,
}: AbsencesModalProps) {
  const { actualAbsencesDates, getAbsencesByStudent } = useAttendance();
  const [loading, setLoading] = useState(true);

  const fetchAbsencesByStudent = async (studentId: string) => {
    const res = await getAbsencesByStudent(classId, studentId);

    if (res.state == "error") {
      message.error(res.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    if (!student) return;

    fetchAbsencesByStudent(student.userId);
  }, [student])

  const columns = [
    {
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      render: (_: any, record: AbsenceRow) => (
        <Typography.Text>
          {dayjs(record.date).format("DD/MM/YYYY")}
        </Typography.Text>
      ),
    }
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{
          display: 'flex', alignItems: 'center', fontSize: '16px', marginBottom: '16px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          <CalendarOutlined
            style={{ marginRight: '8px', fontSize: '20px' }}
          />
          {`Ausencias de ${student?.name} ${student?.lastname}`}
        </div>
      }
      footer={[
        <Button type="primary" onClick={onClose}>
          Aceptar
        </Button>
      ]}
      width={window.innerWidth < 600 ? '60%' : '35%'}
    >
      {actualAbsencesDates && actualAbsencesDates.length > 0 ? (
        <Table
          columns={columns}
          dataSource={actualAbsencesDates}
          loading={loading}
          pagination={false}
        />
      ) : (
        <Empty description="No hay ausencias registradas" />
      )}
    </Modal>
  );
}

export default AbsencesModal;
